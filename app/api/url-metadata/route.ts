import { NextResponse } from "next/server";
import { z } from "zod";

import {
  assertFetchablePublicUrl,
  parseUrlMetadataFromHtml,
  urlMetadataSchema,
} from "@/lib/url-metadata";

const requestSchema = z.object({
  url: z.string().min(1),
});

const MAX_HTML_BYTES = 512_000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "URL を指定してください" }, { status: 400 });
  }

  let target: URL;
  try {
    target = assertFetchablePublicUrl(parsed.data.url);
  } catch (err) {
    const message = err instanceof Error ? err.message : "URL が無効です";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const res = await fetch(target.toString(), {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "workspace-ui-kit/0.1 (url-metadata preview)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `ページを取得できませんでした（${res.status}）` },
        { status: 502 },
      );
    }

    const buf = await res.arrayBuffer();
    const html = new TextDecoder("utf-8", { fatal: false }).decode(
      buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf,
    );

    const meta = parseUrlMetadataFromHtml(html, target.toString());
    const validated = urlMetadataSchema.safeParse(meta);
    if (!validated.success) {
      return NextResponse.json(
        { error: "メタデータを読み取れませんでした" },
        { status: 422 },
      );
    }

    return NextResponse.json(validated.data);
  } catch {
    return NextResponse.json(
      { error: "メタデータの取得に失敗しました。URL を確認してください。" },
      { status: 502 },
    );
  }
}
