/**
 * YouTube Reporting API — channel_reach_basic_a1（サムネ IMP / CTR 日次）。
 */

const REPORTING_BASE = "https://youtubereporting.googleapis.com/v1";
export const REACH_REPORT_TYPE_ID = "channel_reach_basic_a1";

export type ReachDailyRow = {
  date: string;
  videoId: string;
  impressions: number;
  /** 0〜1 の比率。 */
  ctrRatio: number;
};

type ReportJob = {
  id?: string;
  reportTypeId?: string;
  name?: string;
};

type ReportFile = {
  id?: string;
  startTime?: string;
  endTime?: string;
  createTime?: string;
};

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells.map((c) => c.trim());
}

export function parseReachReportCsv(text: string): ReachDailyRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const dateIdx = headers.indexOf("date");
  const videoIdx = headers.indexOf("video_id");
  const impIdx = headers.indexOf("video_thumbnail_impressions");
  const ctrIdx = headers.indexOf("video_thumbnail_impressions_ctr");

  if (dateIdx < 0 || videoIdx < 0 || impIdx < 0 || ctrIdx < 0) {
    return [];
  }

  const rows: ReachDailyRow[] = [];
  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    const date = cols[dateIdx];
    const videoId = cols[videoIdx];
    const impressions = Number(cols[impIdx]);
    const ctrRatio = Number(cols[ctrIdx]);
    if (!date || !videoId || !Number.isFinite(impressions)) continue;
    rows.push({
      date,
      videoId,
      impressions,
      ctrRatio: Number.isFinite(ctrRatio) ? ctrRatio : 0,
    });
  }
  return rows;
}

async function reportingFetch<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${REPORTING_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `YouTube Reporting API エラー（${res.status}）: ${body.slice(0, 200)}`,
    );
  }

  return res.json() as Promise<T>;
}

/** reach レポートジョブを取得または作成。 */
export async function ensureReachReportJob(accessToken: string): Promise<string> {
  const envJobId = process.env.YOUTUBE_REACH_REPORT_JOB_ID?.trim();
  if (envJobId) return envJobId;

  const listed = await reportingFetch<{ jobs?: ReportJob[] }>(
    "/jobs",
    accessToken,
  );
  const existing = listed.jobs?.find(
    (job) => job.reportTypeId === REACH_REPORT_TYPE_ID && job.id,
  );
  if (existing?.id) return existing.id;

  const created = await reportingFetch<ReportJob>("/jobs", accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reportTypeId: REACH_REPORT_TYPE_ID,
      name: "Channel reach basic (workspace-ui-kit)",
    }),
  });

  if (!created.id) {
    throw new Error("YouTube reach レポートジョブの作成に失敗しました");
  }
  return created.id;
}

/** 利用可能な reach CSV をすべて取得して日次行に展開。 */
export async function fetchReachDailyRows(
  accessToken: string,
  minDate?: string,
): Promise<ReachDailyRow[]> {
  const jobId = await ensureReachReportJob(accessToken);
  const listed = await reportingFetch<{ reports?: ReportFile[] }>(
    `/jobs/${jobId}/reports`,
    accessToken,
  );

  const reports = (listed.reports ?? []).filter((report) => {
    if (!report.id || !report.startTime) return false;
    if (!minDate) return true;
    const day = report.startTime.slice(0, 10);
    return day >= minDate;
  });

  const allRows: ReachDailyRow[] = [];
  for (const report of reports) {
    const res = await fetch(
      `${REPORTING_BASE}/jobs/${jobId}/reports/${report.id}?alt=media`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      },
    );
    if (!res.ok) continue;
    const text = await res.text();
    allRows.push(...parseReachReportCsv(text));
  }

  return allRows;
}

/** 期間内の IMP / CTR を集計（CTR は IMP 加重平均）。 */
export function aggregateReachForRange(
  rows: ReachDailyRow[],
  videoId: string,
  startDate: string,
  endDate: string,
): { impressions: number; ctrPercent: string } | null {
  const filtered = rows.filter(
    (row) =>
      row.videoId === videoId &&
      row.date >= startDate &&
      row.date <= endDate,
  );
  if (filtered.length === 0) return null;

  let totalImpressions = 0;
  let weightedClicks = 0;
  for (const row of filtered) {
    totalImpressions += row.impressions;
    weightedClicks += row.impressions * row.ctrRatio;
  }
  if (totalImpressions <= 0) {
    return { impressions: 0, ctrPercent: "0.0" };
  }

  return {
    impressions: totalImpressions,
    ctrPercent: ((weightedClicks / totalImpressions) * 100).toFixed(1),
  };
}

/** 動画の reach 日次行をすべて合算（公開日不明時のフォールバック）。 */
export function aggregateReachLifetimeForVideo(
  rows: ReachDailyRow[],
  videoId: string,
): { impressions: number; ctrPercent: string } | null {
  const filtered = rows.filter((row) => row.videoId === videoId);
  if (filtered.length === 0) return null;

  let totalImpressions = 0;
  let weightedClicks = 0;
  for (const row of filtered) {
    totalImpressions += row.impressions;
    weightedClicks += row.impressions * row.ctrRatio;
  }
  if (totalImpressions <= 0) {
    return { impressions: 0, ctrPercent: "0.0" };
  }

  return {
    impressions: totalImpressions,
    ctrPercent: ((weightedClicks / totalImpressions) * 100).toFixed(1),
  };
}
