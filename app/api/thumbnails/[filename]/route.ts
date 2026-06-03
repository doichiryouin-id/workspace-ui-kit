import { readFile } from "node:fs/promises";
import path from "node:path";

const THUMBNAIL_DIR = path.join(process.cwd(), "data", "thumbnails");

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

type RouteContext = { params: Promise<{ filename: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { filename } = await context.params;

  if (!/^[\w-]+\.(jpg|jpeg|png|webp|gif)$/i.test(filename)) {
    return new Response("Not found", { status: 404 });
  }

  const filepath = path.join(THUMBNAIL_DIR, filename);
  try {
    const data = await readFile(filepath);
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    return new Response(data, {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { filename } = await context.params;

  if (!/^[\w-]+\.(jpg|jpeg|png|webp|gif)$/i.test(filename)) {
    return new Response("Not found", { status: 404 });
  }

  const filepath = path.join(THUMBNAIL_DIR, filename);
  try {
    const { unlink } = await import("node:fs/promises");
    await unlink(filepath);
    return new Response(null, { status: 204 });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
