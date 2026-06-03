import { NextResponse } from "next/server";

/** 設定状況のみ返す（秘密値は含めない）。 */
export async function GET() {
  const apiKey = Boolean(process.env.YOUTUBE_API_KEY?.trim());
  const clientId = Boolean(process.env.YOUTUBE_CLIENT_ID?.trim());
  const clientSecret = Boolean(process.env.YOUTUBE_CLIENT_SECRET?.trim());
  const refreshToken = Boolean(process.env.YOUTUBE_REFRESH_TOKEN?.trim());
  const channelId = Boolean(process.env.YOUTUBE_CHANNEL_ID?.trim());

  const dataApi = apiKey;
  const analyticsApi = clientId && clientSecret && refreshToken;

  return NextResponse.json({
    dataApi,
    analyticsApi,
    channelIdConfigured: channelId,
    capabilities: {
      views: dataApi || analyticsApi,
      likes: dataApi,
      comments: dataApi,
      impressions: analyticsApi,
      ctr: analyticsApi,
      averageViewRate: analyticsApi,
      averageViewDuration: analyticsApi,
      subscribersGained: analyticsApi,
    },
    missing: [
      !apiKey && "YOUTUBE_API_KEY（視聴回数・高評価・コメント）",
      !clientId && "YOUTUBE_CLIENT_ID（インプレッション等）",
      !clientSecret && "YOUTUBE_CLIENT_SECRET",
      !refreshToken && "YOUTUBE_REFRESH_TOKEN",
    ].filter(Boolean),
  });
}
