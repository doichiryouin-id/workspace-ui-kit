/**
 * YouTube Analytics API — 動画の視聴回数（期間累計）。
 */

type AnalyticsReport = {
  columnHeaders?: Array<{ name?: string }>;
  rows?: Array<Array<string | number>>;
};

async function queryAnalyticsReport(
  params: URLSearchParams,
  accessToken: string,
): Promise<AnalyticsReport> {
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

  return res.json() as Promise<AnalyticsReport>;
}

function readViewsFromReport(report: AnalyticsReport): number | null {
  const headers = report.columnHeaders?.map((h) => h.name ?? "") ?? [];
  const rows = report.rows ?? [];
  if (rows.length === 0) return null;

  const viewsIdx = headers.indexOf("views");
  if (viewsIdx < 0) return null;

  const dayIdx = headers.indexOf("day");
  if (dayIdx >= 0) {
    let sum = 0;
    let hasValue = false;
    for (const row of rows) {
      const views = Number(row[viewsIdx]);
      if (!Number.isFinite(views)) continue;
      sum += views;
      hasValue = true;
    }
    return hasValue ? sum : null;
  }

  const views = Number(rows[0]![viewsIdx]);
  return Number.isFinite(views) ? views : null;
}

/** 期間内の動画視聴回数（OAuth）。Pane 3 維持率と同じ dimensions=video を優先。 */
export async function fetchVideoViewsInRange(
  videoId: string,
  startDate: string,
  endDate: string,
  accessToken: string,
  channelFilter: string,
): Promise<number | null> {
  const base = {
    ids: channelFilter,
    startDate,
    endDate,
    metrics: "views",
    filters: `video==${videoId}`,
  };

  const strategies: URLSearchParams[] = [
    new URLSearchParams({ ...base, dimensions: "video" }),
    new URLSearchParams({ ...base, dimensions: "day" }),
    new URLSearchParams(base),
  ];

  for (const params of strategies) {
    const report = await queryAnalyticsReport(params, accessToken);
    const views = readViewsFromReport(report);
    if (views !== null) return views;
  }

  return null;
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

export { readViewsFromReport, queryAnalyticsReport, type AnalyticsReport };
