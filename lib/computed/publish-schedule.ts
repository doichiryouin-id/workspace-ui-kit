/**
 * 公開予定日の派生計算（Pane 1 サイドバー用）。
 * `profile.availableStartDate`（ISO 日付）と `profile.source`（シリーズ名）を参照する。
 */

import { compareAsc, format, startOfDay, startOfToday } from "date-fns";

import { parseISODate } from "@/lib/computed/profile";
import { type VideoPlan } from "@/lib/schema";

export type PublishScheduleItem = {
  videoPlanId: string;
  title: string;
  series: string;
  isoDate: string;
  dateLabel: string;
};

/** ISO 日付文字列を Pane 表示用 `M/d`（例: 6/3）に変換。無効・空なら null。 */
export function formatPublishDateLabel(iso: string): string | null {
  const date = parsePublishDate(iso);
  return date ? format(date, "M/d") : null;
}

/** `YYYY-MM-DD` をローカル暦の日付に変換（カレンダー照合と InlineDateField と揃える）。 */
function parsePublishDate(iso: string): Date | null {
  const trimmed = iso.trim();
  if (!trimmed) return null;
  const parsed = parseISODate(trimmed);
  return parsed ? startOfDay(parsed) : null;
}

function toScheduleItem(plan: VideoPlan, date: Date): PublishScheduleItem {
  return {
    videoPlanId: plan.id,
    title: plan.profile.name,
    series: plan.profile.source.trim(),
    isoDate: plan.profile.availableStartDate.trim(),
    dateLabel: formatPublishDateLabel(plan.profile.availableStartDate) ?? "",
  };
}

function plansWithPublishDate(
  videoPlans: VideoPlan[],
): { plan: VideoPlan; date: Date }[] {
  return videoPlans
    .filter((c) => !c.archived)
    .map((c) => {
      const date = parsePublishDate(c.profile.availableStartDate);
      return date ? { plan: c, date } : null;
    })
    .filter((row): row is { plan: VideoPlan; date: Date } => row !== null);
}

export function getUpcomingPublishSchedule(
  videoPlans: VideoPlan[],
  limit = 3,
): PublishScheduleItem[] {
  const rows = plansWithPublishDate(videoPlans).sort((a, b) =>
    compareAsc(a.date, b.date),
  );
  if (rows.length === 0) return [];

  const today = startOfToday();
  const fromToday = rows.filter((r) => r.date >= today);
  const source = fromToday.length > 0 ? fromToday : rows;

  return source.slice(0, limit).map((r) => toScheduleItem(r.plan, r.date));
}

export function getNextPublishForSeries(
  videoPlans: VideoPlan[],
  seriesName: string,
): PublishScheduleItem | null {
  const rows = plansWithPublishDate(videoPlans)
    .filter((r) => r.plan.profile.source.trim() === seriesName)
    .sort((a, b) => compareAsc(a.date, b.date));

  if (rows.length === 0) return null;

  const today = startOfToday();
  const next =
    rows.find((r) => r.date >= today) ?? rows[rows.length - 1] ?? null;
  if (!next) return null;

  return toScheduleItem(next.plan, next.date);
}

/** 公開予定日が設定された非アーカイブ企画の日付一覧（カレンダー modifiers 用）。 */
export function getScheduledPublishDates(videoPlans: VideoPlan[]): Date[] {
  return plansWithPublishDate(videoPlans).map((r) => r.date);
}

/** `YYYY-MM-DD` 文字列一覧（カレンダー照合の SSoT。Date のタイムゾーンずれを避ける）。 */
export function getScheduledPublishIsoDates(videoPlans: VideoPlan[]): string[] {
  return videoPlans
    .filter((p) => !p.archived)
    .map((p) => p.profile.availableStartDate.trim())
    .filter((iso) => parsePublishDate(iso) !== null);
}

export function getSeriesVideoSchedule(
  videoPlans: VideoPlan[],
  seriesName: string,
): PublishScheduleItem[] {
  const inSeries = videoPlans.filter(
    (c) => !c.archived && c.profile.source.trim() === seriesName,
  );

  const withDate: { plan: VideoPlan; date: Date }[] = [];
  const withoutDate: VideoPlan[] = [];

  for (const c of inSeries) {
    const date = parsePublishDate(c.profile.availableStartDate);
    if (date) withDate.push({ plan: c, date });
    else withoutDate.push(c);
  }

  withDate.sort((a, b) => compareAsc(a.date, b.date));
  withoutDate.sort((a, b) => a.profile.name.localeCompare(b.profile.name, "ja"));

  return [
    ...withDate.map((r) => toScheduleItem(r.plan, r.date)),
    ...withoutDate.map((c) => ({
      videoPlanId: c.id,
      title: c.profile.name,
      series: c.profile.source.trim(),
      isoDate: "",
      dateLabel: "",
    })),
  ];
}
