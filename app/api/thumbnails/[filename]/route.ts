import { unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  contentTypeForFilename,
  readThumbnailFile,
} from "@/lib/thumbnails/store";
import { createSupabaseAdmin } from "@/lib/supabase/workspace-store";

const LOCAL_DIR = path.join(process.cwd(), "data", "thumbnails");
const TMP_DIR = path.join(os.tmpdir(), "workspace-thumbnails");

type RouteContext = { params: Promise<{ filename: string }> };

function isSafeFilename(filename: string): boolean {
  return /^[\w-]+\.(jpg|jpeg|png|webp|gif)$/i.test(filename);
}

export async function GET(_request: Request, context: RouteContext) {
  const { filename } = await context.params;

  if (!isSafeFilename(filename)) {
    return new Response("Not found", { status: 404 });
  }

  const data = await readThumbnailFile(filename);
  if (!data) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": contentTypeForFilename(filename),
      "Cache-Control": "private, max-age=3600",
    },
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { filename } = await context.params;

  if (!isSafeFilename(filename)) {
    return new Response("Not found", { status: 404 });
  }

  for (const dir of [LOCAL_DIR, TMP_DIR]) {
    try {
      await unlink(path.join(dir, filename));
      return new Response(null, { status: 204 });
    } catch {
      // try next location
    }
  }

  const supabase = createSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.storage.from("thumbnails").remove([filename]);
    if (!error) return new Response(null, { status: 204 });
  }

  return new Response("Not found", { status: 404 });
}
