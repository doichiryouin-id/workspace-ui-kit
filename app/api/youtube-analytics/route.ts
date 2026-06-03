import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchYouTubeAnalytics } from "@/lib/youtube/fetch-analytics";

const requestSchema = z.object({
  url: z.string().min(1),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "YouTube 動画 URL を指定してください" },
      { status: 400 },
    );
  }

  try {
    const result = await fetchYouTubeAnalytics(parsed.data.url);
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "分析データの取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
