import { NextResponse } from "next/server";
import { z } from "zod";

import { isPublishedScheduleEntry } from "@/lib/computed/analytics-compare";
import {
  fetchMilestonesBatch,
  type MilestoneFetchItem,
} from "@/lib/youtube/fetch-milestones";
import { hasYouTubeOAuth } from "@/lib/youtube/oauth";

const itemSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  publishDate: z.string().min(1),
});

const requestSchema = z.object({
  items: z.array(itemSchema).optional(),
});

export async function POST(request: Request) {
  if (!hasYouTubeOAuth()) {
    return NextResponse.json(
      { error: "YouTube OAuth 未設定です" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "items（id, url, publishDate）を指定してください" },
      { status: 400 },
    );
  }

  const items: MilestoneFetchItem[] = parsed.data.items ?? [];

  if (items.length === 0) {
    return NextResponse.json(
      { error: "更新対象の動画がありません" },
      { status: 400 },
    );
  }

  try {
    const results = await fetchMilestonesBatch(items);
    return NextResponse.json({ results });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "マイルストーン取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET() {
  return NextResponse.json({
    oauth: hasYouTubeOAuth(),
    hint: "POST { items: [{ id, url, publishDate }] }",
    publishedFilter: isPublishedScheduleEntry.name,
  });
}
