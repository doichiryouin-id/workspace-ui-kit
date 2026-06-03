/**
 * Pane 4: 公開済み動画の分析比較表。
 */

import { format } from "date-fns";
import { ja } from "date-fns/locale";

import { parseISODate } from "@/lib/computed/profile";
import { isMilestoneWindowDue } from "@/lib/youtube/milestone-windows";
import {
  type CompareWindow,
  type MilestoneMap,
  type MilestoneWindow,
  type ShootingScheduleEntry,
  type VideoAnalytics,
} from "@/lib/schema";

export const COMPARE_METRICS = [
  "views",
  "impressions",
  "ctrPercent",
  "averageViewRatePercent",
] as const;

export const MILESTONE_COMPARE_METRICS = [
  "views",
  "impressions",
  "ctrPercent",
] as const;

export type CompareMetricKey = (typeof COMPARE_METRICS)[number];
export type MilestoneCompareMetricKey =
  (typeof MILESTONE_COMPARE_METRICS)[number];

export type CompareRow = {
  id: string;
  publishDate: string;
  publishLabel: string;
  title: string;
  thumbnailImageUrl: string;
  analytics: VideoAnalytics;
  milestones: MilestoneMap;
};

export type MetricAverages = Record<CompareMetricKey, number | null>;
export type MilestoneMetricAverages = Record<
  MilestoneCompareMetricKey,
  number | null
>;

export type CompareBenchmarks = {
  overall: MetricAverages;
  thisMonth: MetricAverages;
  prevMonth: MetricAverages;
  mustReach: MetricAverages;
  thisMonthLabel: string;
  prevMonthLabel: string;
};

export type MilestoneCompareBenchmarks = {
  overall: MilestoneMetricAverages;
  thisMonth: MilestoneMetricAverages;
  prevMonth: MilestoneMetricAverages;
  mustReach: MilestoneMetricAverages;
  thisMonthLabel: string;
  prevMonthLabel: string;
};

/** 公開済み = slot + 公開日 + YouTube URL */
export function isPublishedScheduleEntry(
  entry: ShootingScheduleEntry,
): boolean {
  return (
    entry.kind === "slot" &&
    entry.publishDate.trim() !== "" &&
    entry.url.trim() !== ""
  );
}

export function getPublishedCompareRows(
  entries: ShootingScheduleEntry[],
): CompareRow[] {
  return entries
    .filter(isPublishedScheduleEntry)
    .sort((a, b) => a.publishDate.localeCompare(b.publishDate, "ja"))
    .map((entry) => ({
      id: entry.id,
      publishDate: entry.publishDate.trim(),
      publishLabel: formatPublishLabel(entry.publishDate),
      title:
        entry.videoTitle.trim() ||
        entry.videoContent.trim() ||
        "（タイトル未入力）",
      thumbnailImageUrl: entry.thumbnailImageUrl,
      analytics: entry.analytics,
      milestones: entry.milestones ?? {},
    }));
}

function formatPublishLabel(iso: string): string {
  const d = parseISODate(iso);
  return d ? format(d, "M/d(E)", { locale: ja }) : iso;
}

export function parseMetricNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/,/g, "").replace(/%$/, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function getMetricValue(
  analytics: VideoAnalytics,
  key: CompareMetricKey,
): number | null {
  return parseMetricNumber(analytics[key]);
}

export function getMilestoneMetricValue(
  milestones: MilestoneMap,
  window: MilestoneWindow,
  key: MilestoneCompareMetricKey,
): number | null {
  const snapshot = milestones[window];
  if (!snapshot) return null;
  return parseMetricNumber(snapshot[key]);
}

export function getMetricRawForWindow(
  row: CompareRow,
  window: CompareWindow,
  key: CompareMetricKey | MilestoneCompareMetricKey,
): string {
  if (window === "lifetime") {
    return row.analytics[key as CompareMetricKey] ?? "";
  }
  return row.milestones[window]?.[key as MilestoneCompareMetricKey] ?? "";
}

export function isCompareCellPending(
  row: CompareRow,
  window: CompareWindow,
): boolean {
  if (window === "lifetime") return false;
  return !isMilestoneWindowDue(row.publishDate, window);
}

export function computeMetricAverages(rows: CompareRow[]): MetricAverages {
  const result = {} as MetricAverages;
  for (const key of COMPARE_METRICS) {
    const values = rows
      .map((r) => getMetricValue(r.analytics, key))
      .filter((v): v is number => v !== null);
    result[key] =
      values.length > 0
        ? values.reduce((a, b) => a + b, 0) / values.length
        : null;
  }
  return result;
}

export function computeMilestoneMetricAverages(
  rows: CompareRow[],
  window: MilestoneWindow,
  referenceDate: Date = new Date(),
): MilestoneMetricAverages {
  const result = {} as MilestoneMetricAverages;
  const eligible = rows.filter((row) =>
    isMilestoneWindowDue(row.publishDate, window, referenceDate),
  );

  for (const key of MILESTONE_COMPARE_METRICS) {
    const values = eligible
      .map((r) => getMilestoneMetricValue(r.milestones, window, key))
      .filter((v): v is number => v !== null);
    result[key] =
      values.length > 0
        ? values.reduce((a, b) => a + b, 0) / values.length
        : null;
  }
  return result;
}

const MUST_REACH_RATIO = 0.8;

function scaleAverages(
  averages: MetricAverages,
  ratio: number,
): MetricAverages {
  const scaled = {} as MetricAverages;
  for (const key of COMPARE_METRICS) {
    scaled[key] =
      averages[key] !== null ? averages[key]! * ratio : null;
  }
  return scaled;
}

function scaleMilestoneAverages(
  averages: MilestoneMetricAverages,
  ratio: number,
): MilestoneMetricAverages {
  const scaled = {} as MilestoneMetricAverages;
  for (const key of MILESTONE_COMPARE_METRICS) {
    scaled[key] =
      averages[key] !== null ? averages[key]! * ratio : null;
  }
  return scaled;
}

function filterRowsByYearMonth(
  rows: CompareRow[],
  year: number,
  month: number,
): CompareRow[] {
  return rows.filter((row) => {
    const d = parseISODate(row.publishDate);
    if (!d) return false;
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });
}

export function computeCompareBenchmarks(
  rows: CompareRow[],
  referenceDate: Date = new Date(),
): CompareBenchmarks {
  const overall = computeMetricAverages(rows);

  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth() + 1;
  const prevMonthDate = new Date(year, month - 2, 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonth = prevMonthDate.getMonth() + 1;

  const thisMonthRows = filterRowsByYearMonth(rows, year, month);
  const prevMonthRows = filterRowsByYearMonth(rows, prevYear, prevMonth);

  return {
    overall,
    thisMonth: computeMetricAverages(thisMonthRows),
    prevMonth: computeMetricAverages(prevMonthRows),
    mustReach: scaleAverages(overall, MUST_REACH_RATIO),
    thisMonthLabel: `${month}月平均`,
    prevMonthLabel: `${prevMonth}月平均`,
  };
}

export function computeMilestoneCompareBenchmarks(
  rows: CompareRow[],
  window: MilestoneWindow,
  referenceDate: Date = new Date(),
): MilestoneCompareBenchmarks {
  const overall = computeMilestoneMetricAverages(rows, window, referenceDate);

  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth() + 1;
  const prevMonthDate = new Date(year, month - 2, 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonth = prevMonthDate.getMonth() + 1;

  const thisMonthRows = filterRowsByYearMonth(rows, year, month);
  const prevMonthRows = filterRowsByYearMonth(rows, prevYear, prevMonth);

  return {
    overall,
    thisMonth: computeMilestoneMetricAverages(
      thisMonthRows,
      window,
      referenceDate,
    ),
    prevMonth: computeMilestoneMetricAverages(
      prevMonthRows,
      window,
      referenceDate,
    ),
    mustReach: scaleMilestoneAverages(overall, MUST_REACH_RATIO),
    thisMonthLabel: `${month}月平均`,
    prevMonthLabel: `${prevMonth}月平均`,
  };
}

export type MetricCompareTone = "above" | "below" | "neutral" | "empty";

export function compareToBenchmark(
  value: number | null,
  benchmark: number | null,
): MetricCompareTone {
  if (value === null || benchmark === null || benchmark === 0) return "empty";
  const ratio = value / benchmark;
  if (ratio >= 1.05) return "above";
  if (ratio <= 0.95) return "below";
  return "neutral";
}

export function formatCompareCell(
  raw: string,
  key: CompareMetricKey | MilestoneCompareMetricKey,
): string {
  const n = parseMetricNumber(raw);
  if (n === null) return "—";
  if (key === "ctrPercent" || key === "averageViewRatePercent") {
    return `${n.toLocaleString("ja-JP", { maximumFractionDigits: 1 })}%`;
  }
  return Math.round(n).toLocaleString("ja-JP");
}

export function formatAverageCell(
  value: number | null,
  key: CompareMetricKey | MilestoneCompareMetricKey,
): string {
  if (value === null) return "—";
  if (key === "ctrPercent" || key === "averageViewRatePercent") {
    return `${value.toLocaleString("ja-JP", { maximumFractionDigits: 1 })}%`;
  }
  return Math.round(value).toLocaleString("ja-JP");
}
