const VIDEO_ID_PATTERN = /^[\w-]{11}$/;

/** YouTube URL / 11 文字 ID から videoId を取り出す。 */
export function parseYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (VIDEO_ID_PATTERN.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id && VIDEO_ID_PATTERN.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com") {
    const v = url.searchParams.get("v");
    if (v && VIDEO_ID_PATTERN.test(v)) return v;

    const parts = url.pathname.split("/").filter(Boolean);
    const embedIndex = parts.indexOf("embed");
    if (embedIndex >= 0 && parts[embedIndex + 1]) {
      const id = parts[embedIndex + 1];
      return VIDEO_ID_PATTERN.test(id) ? id : null;
    }

    const shortsIndex = parts.indexOf("shorts");
    if (shortsIndex >= 0 && parts[shortsIndex + 1]) {
      const id = parts[shortsIndex + 1];
      return VIDEO_ID_PATTERN.test(id) ? id : null;
    }
  }

  return null;
}
