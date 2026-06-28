/**
 * YouTube Reporting API — channel_reach_basic_a1（サムネ IMP / CTR 日次）。
 */

const REPORTING_BASE = "https://youtubereporting.googleapis.com/v1";
export const REACH_REPORT_TYPE_ID = "channel_reach_basic_a1";

/** Pane 3 累計用。日次レポートを丸ごと取りすぎない。 */
export const REACH_REPORT_FILES_PANE3 = 7;
/** マイルストーン 30 日分をカバーする目安。 */
export const REACH_REPORT_FILES_MILESTONES = 35;

const REACH_ROWS_CACHE_MS = 10 * 60 * 1000;

export type ReachDailyRow = {
  date: string;
  videoId: string;
  impressions: number;
  /** 0〜1 の比率。 */
  ctrRatio: number;
};

export type FetchReachDailyRowsOptions = {
  /** 取得する CSV ファイル数の上限（新しい順）。未指定は全件。 */
  maxReportFiles?: number;
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
  downloadUrl?: string;
};

/** YYYYMMDD → YYYY-MM-DD。reach CSV は日付形式が混在する。 */
export function normalizeReachDate(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
  }
  return trimmed;
}

/** Reporting API の 1 分あたり上限。 */
export class ReachQuotaExceededError extends Error {
  constructor() {
    super("ReachQuotaExceeded");
    this.name = "ReachQuotaExceededError";
  }
}

let reachRowsCache: {
  rows: ReachDailyRow[];
  expiresAt: number;
  maxKey: string | number;
} | null = null;

export function clearReachRowsCache(): void {
  reachRowsCache = null;
}

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
      date: normalizeReachDate(date),
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

  if (res.status === 429) {
    throw new ReachQuotaExceededError();
  }

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

function selectReportFiles(
  reports: ReportFile[],
  maxReportFiles?: number,
): ReportFile[] {
  const sorted = reports
    .filter((report) => report.id && report.startTime)
    .sort((a, b) =>
      (b.startTime ?? "").localeCompare(a.startTime ?? ""),
    );
  if (maxReportFiles == null || maxReportFiles <= 0) return sorted;
  return sorted.slice(0, maxReportFiles);
}

/** 利用可能な reach CSV を日次行に展開（キャッシュ・件数上限付き）。 */
export async function fetchReachDailyRows(
  accessToken: string,
  options: FetchReachDailyRowsOptions = {},
): Promise<ReachDailyRow[]> {
  const cacheKey = options.maxReportFiles ?? "all";
  if (
    reachRowsCache &&
    Date.now() < reachRowsCache.expiresAt &&
    reachRowsCache.maxKey === cacheKey
  ) {
    return reachRowsCache.rows;
  }

  const jobId = await ensureReachReportJob(accessToken);
  const listed = await reportingFetch<{ reports?: ReportFile[] }>(
    `/jobs/${jobId}/reports`,
    accessToken,
  );

  const reports = selectReportFiles(
    listed.reports ?? [],
    options.maxReportFiles,
  );

  const allRows: ReachDailyRow[] = [];
  for (const report of reports) {
    const downloadUrl = report.downloadUrl;
    if (!downloadUrl) continue;

    const res = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (res.status === 429) {
      throw new ReachQuotaExceededError();
    }
    if (!res.ok) continue;
    const text = await res.text();
    allRows.push(...parseReachReportCsv(text));
  }

  reachRowsCache = {
    rows: allRows,
    expiresAt: Date.now() + REACH_ROWS_CACHE_MS,
    maxKey: cacheKey,
  };

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
