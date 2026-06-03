import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

const THUMBNAIL_DIR = path.join(process.cwd(), "data", "thumbnails");
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function extForMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
}

function safeEntryId(raw: string): string | null {
  if (/^[\w-]{1,64}$/.test(raw)) return raw;
  return null;
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "フォームデータが不正です" }, { status: 400 });
  }

  const entryId = safeEntryId(String(form.get("entryId") ?? ""));
  const file = form.get("file");

  if (!entryId) {
    return NextResponse.json({ error: "entryId が不正です" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "画像ファイルを指定してください" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "JPEG / PNG / WebP / GIF のみ対応しています" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "ファイルサイズは 5MB 以下にしてください" },
      { status: 400 },
    );
  }

  const ext = extForMime(file.type);
  const filename = `${entryId}.${ext}`;
  const filepath = path.join(THUMBNAIL_DIR, filename);

  await mkdir(THUMBNAIL_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  const url = `/api/thumbnails/${filename}?v=${Date.now()}`;
  return NextResponse.json({ url, filename });
}
