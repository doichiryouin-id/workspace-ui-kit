import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createSupabaseAdmin,
  isWorkspaceSyncEnabled,
} from "@/lib/supabase/workspace-store";

const BUCKET = "thumbnails";
const LOCAL_DIR = path.join(process.cwd(), "data", "thumbnails");

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export function contentTypeForFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return MIME[ext] ?? "application/octet-stream";
}

function localThumbnailDir(): string {
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), "workspace-thumbnails");
  }
  return LOCAL_DIR;
}

function isMissingBucketError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("bucket not found") ||
    lower.includes("not found") && lower.includes("bucket")
  );
}

async function uploadToSupabaseBucket(
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const supabase = createSupabaseAdmin();
  if (!supabase) throw new Error("Supabase が未設定です");

  const upload = () =>
    supabase.storage.from(BUCKET).upload(filename, buffer, {
      upsert: true,
      contentType,
    });

  let { error } = await upload();
  if (error && isMissingBucketError(error.message)) {
    const { error: createError } = await supabase.storage.createBucket(BUCKET, {
      public: true,
    });
    if (createError && !createError.message.toLowerCase().includes("already")) {
      throw new Error(createError.message);
    }
    ({ error } = await upload());
  }
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

async function saveToLocalDisk(
  filename: string,
  buffer: Buffer,
): Promise<string> {
  const dir = localThumbnailDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return `/api/thumbnails/${filename}?v=${Date.now()}`;
}

export async function saveThumbnailFile(
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  if (isWorkspaceSyncEnabled()) {
    try {
      return await uploadToSupabaseBucket(filename, buffer, contentType);
    } catch (err) {
      if (process.env.VERCEL) throw err;
      console.warn("[thumbnails] Supabase upload failed, using local disk:", err);
    }
  }
  return saveToLocalDisk(filename, buffer);
}

async function readFromSupabase(
  filename: string,
): Promise<Buffer | null> {
  const supabase = createSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase.storage.from(BUCKET).download(filename);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

async function readFromLocalDisk(filename: string): Promise<Buffer | null> {
  for (const dir of [localThumbnailDir(), LOCAL_DIR]) {
    try {
      return await readFile(path.join(dir, filename));
    } catch {
      // try next location
    }
  }
  return null;
}

export async function readThumbnailFile(
  filename: string,
): Promise<Buffer | null> {
  const local = await readFromLocalDisk(filename);
  if (local) return local;
  return readFromSupabase(filename);
}
