/**
 * YouTube Analytics API — 動画の視聴回数（期間累計）。
 */

type AnalyticsReport = {
  columnHeaders?: Array<{ name?: string }>;
  rows?: Array<Array<string | number>>;
};

export async function fetchVideoViewsInRange(
  videoId: string,
  startDate: string,
  endDate: string,
  accessToken: string,
  channelFilter: string,
): Promise<number | null> {
  const params = new URLSearchParams({
    ids: channelFilter,
    startDate,
    endDate,
    metrics: "views",
    filters: `video==${videoId}`,
  });

  const res = await fetch(
    `https://youtubeanalytics.googleapis.com/v2/reports?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `YouTube Analytics API エラー（${res.status}）: ${body.slice(0, 120)}`,
    );
  }

  const report = (await res.json()) as AnalyticsReport;
  const headers = report.columnHeaders?.map((h) => h.name ?? "") ?? [];
  const row = report.rows?.[0];
  if (!row) return 0;

  const viewsIdx = headers.indexOf("views");
  if (viewsIdx < 0) return null;
  const views = Number(row[viewsIdx]);
  return Number.isFinite(views) ? views : null;
}

/** 公開〜今日までの累計視聴回数（OAuth）。 */
export async function fetchLifetimeVideoViews(
  videoId: string,
  accessToken: string,
  channelFilter: string,
  endDate: string = new Date().toISOString().slice(0, 10),
): Promise<number | null> {
  return fetchVideoViewsInRange(
    videoId,
    "2020-01-01",
    endDate,
    accessToken,
    channelFilter,
  );
}
