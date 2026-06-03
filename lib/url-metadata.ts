import { z } from "zod";

/** API / クライアント共有のメタデータ形。 */
export const urlMetadataSchema = z.object({
  url: z.string().url(),
  title: z.string(),
  description: z.string(),
  siteName: z.string(),
});
export type UrlMetadata = z.infer<typeof urlMetadataSchema>;

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
]);

/** http(s) の公開 URL か検証（SSRF 用の簡易チェック）。 */
export function assertFetchablePublicUrl(raw: string): URL {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("URL を入力してください");
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("URL の形式が正しくありません");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("http または https の URL のみ対応しています");
  }
  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host)) {
    throw new Error("この URL は取得できません");
  }
  if (
    host.endsWith(".local") ||
    /^10\./.test(parsed.hostname) ||
    /^192\.168\./.test(parsed.hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(parsed.hostname)
  ) {
    throw new Error("この URL は取得できません");
  }
  return parsed;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function readMetaTag(html: string, key: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["']`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeHtmlEntities(m[1]);
  }
  return null;
}

/** HTML 断片から Open Graph / title を抽出（サーバー・テスト共用）。 */
export function parseUrlMetadataFromHtml(html: string, pageUrl: string): UrlMetadata {
  const title =
    readMetaTag(html, "og:title") ??
    readMetaTag(html, "twitter:title") ??
    (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]
      ? decodeHtmlEntities(html.match(/<title[^>]*>([^<]*)<\/title>/i)![1])
      : null) ??
    pageUrl;

  const description =
    readMetaTag(html, "og:description") ??
    readMetaTag(html, "description") ??
    readMetaTag(html, "twitter:description") ??
    "";

  const siteName =
    readMetaTag(html, "og:site_name") ?? new URL(pageUrl).hostname;

  return urlMetadataSchema.parse({
    url: pageUrl,
    title,
    description,
    siteName,
  });
}

export type VideoPlanProfileDraft = {
  name: string;
  referenceUrl: string;
  outline: string;
  descriptionNotes: string;
};

/**
 * 取得したメタデータを企画プロフィールへマージ（既存入力は極力上書きしない）。
 */
export function mergeUrlMetadataIntoProfile(
  profile: VideoPlanProfileDraft,
  meta: UrlMetadata,
): VideoPlanProfileDraft {
  const next: VideoPlanProfileDraft = {
    ...profile,
    referenceUrl: meta.url,
  };

  if (!profile.name.trim() && meta.title.trim()) {
    next.name = meta.title.trim();
  }

  const desc = meta.description.trim();
  if (desc) {
    if (!profile.descriptionNotes.trim()) {
      next.descriptionNotes = desc;
    } else if (!profile.descriptionNotes.includes(desc)) {
      next.descriptionNotes = `${profile.descriptionNotes.trim()}\n\n参考（${meta.siteName}）\n${desc}`;
    }
  }

  if (!profile.outline.trim() && meta.title.trim() && profile.name.trim() !== meta.title.trim()) {
    next.outline = `参考タイトル: ${meta.title.trim()}`;
  }

  return next;
}
