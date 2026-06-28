import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";

import { parseISODate } from "@/lib/computed/profile";
import { type MilestoneWindow } from "@/lib/schema";

/** 公開日からの比較ウィンドウ（累計の終了日 = 公開日 + この日数）。 */
export const MILESTONE_DAY_OFFSETS: Record<MilestoneWindow, number> = {
  "24h": 1,
  "3d": 3,
  "7d": 7,
  "30d": 30,
};

export const MILESTONE_WINDOW_ORDER: MilestoneWindow[] = [
  "24h",
  "3d",
  "7d",
  "30d",
];

export function milestoneEndDate(
  publishDate: string,
  window: MilestoneWindow,
): string | null {
  const start = parseISODate(publishDate.trim());
  if (!start) return null;
  return format(addDays(start, MILESTONE_DAY_OFFSETS[window]), "yyyy-MM-dd");
}

/** ウィンドウ終了日を過ぎていれば集計可能。 */
export function isMilestoneWindowDue(
  publishDate: string,
  window: MilestoneWindow,
  referenceDate: Date = new Date(),
): boolean {
  const endIso = milestoneEndDate(publishDate, window);
  if (!endIso) return false;
  const end = startOfDay(parseISO(endIso));
  return startOfDay(referenceDate) >= end;
}

export function dueMilestoneWindows(
  publishDate: string,
  referenceDate: Date = new Date(),
): MilestoneWindow[] {
  return MILESTONE_WINDOW_ORDER.filter((window) =>
    isMilestoneWindowDue(publishDate, window, referenceDate),
  );
}

/** 公開日〜ウィンドウ終了日（両端含む）の日付範囲。 */
export function milestoneDateRange(
  publishDate: string,
  window: MilestoneWindow,
): { startDate: string; endDate: string } | null {
  const trimmed = publishDate.trim();
  const endDate = milestoneEndDate(trimmed, window);
  if (!trimmed || !endDate) return null;
  return { startDate: trimmed, endDate };
}

/** YouTube Analytics の日次データは通常 2〜3 日遅れる。 */
export const ANALYTICS_DAY_LAG_DAYS = 3;

/**
 * ウィンドウ終了後も Analytics 日次が未反映の可能性がある期間。
 * この間は 0 / 空を「未取得」とみなし UI で反映待ち表示する。
 */
export function isMilestoneAnalyticsLag(
  publishDate: string,
  window: MilestoneWindow,
  referenceDate: Date = new Date(),
): boolean {
  if (!isMilestoneWindowDue(publishDate, window, referenceDate)) return false;
  const endIso = milestoneEndDate(publishDate, window);
  if (!endIso) return false;
  const daysSinceEnd = differenceInCalendarDays(
    startOfDay(referenceDate),
    startOfDay(parseISO(endIso)),
  );
  return daysSinceEnd >= 0 && daysSinceEnd < ANALYTICS_DAY_LAG_DAYS;
}

/** reach CSV 用: 指定範囲に含まれる日付か。 */
export function isDateInRange(
  date: string,
  startDate: string,
  endDate: string,
): boolean {
  return date >= startDate && date <= endDate;
}
