/**
 * 撮影スケジュール（Pane 2）の派生計算。
 */

import { format } from "date-fns";

import { parseISODate } from "@/lib/computed/profile";
import { type ShootingScheduleEntry } from "@/lib/schema";

export const SHOOTING_SCHEDULE_MONTHS = [6, 7, 8, 9, 10, 11, 12] as const;
export const SLOTS_PER_MONTH = 4;

export type ShootingScheduleMonthGroup = {
  month: number;
  label: string;
  slots: ShootingScheduleEntry[];
  freeEntry: ShootingScheduleEntry | null;
  filledCount: number;
};

export type PublishScheduleListItem = {
  id: string;
  publishDate: string;
  publishDateLabel: string;
  title: string;
  month: number;
};

export function monthLabel(month: number): string {
  return `${month}月`;
}

export function formatScheduleDateShort(iso: string): string {
  const d = parseISODate(iso);
  return d ? format(d, "M/d") : "—";
}

export function slotLabel(slotIndex: number): string {
  return `第${slotIndex}本`;
}

export function isShootingEntryFilled(entry: ShootingScheduleEntry): boolean {
  if (entry.kind === "free") {
    return entry.freeNote.trim() !== "";
  }
  return (
    entry.videoTitle.trim() !== "" ||
    entry.videoContent.trim() !== "" ||
    entry.shootDate.trim() !== "" ||
    entry.publishDate.trim() !== ""
  );
}

export function groupShootingScheduleByMonth(
  entries: ShootingScheduleEntry[],
  months: readonly number[] = SHOOTING_SCHEDULE_MONTHS,
): ShootingScheduleMonthGroup[] {
  return months.map((month) => {
    const monthEntries = entries.filter((e) => e.month === month);
    const slots = monthEntries
      .filter((e) => e.kind === "slot")
      .sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0));
    const freeEntry =
      monthEntries.find((e) => e.kind === "free") ?? null;
    const filledCount =
      slots.filter(isShootingEntryFilled).length +
      (freeEntry && isShootingEntryFilled(freeEntry) ? 1 : 0);
    return {
      month,
      label: monthLabel(month),
      slots,
      freeEntry,
      filledCount,
    };
  });
}

/** Pane 2: 月見出しなしの表示順（各月 slot 1〜4 → フリー枠、月順 6〜12）。 */
export function flattenShootingScheduleForPane2(
  entries: ShootingScheduleEntry[],
  months: readonly number[] = SHOOTING_SCHEDULE_MONTHS,
): ShootingScheduleEntry[] {
  return groupShootingScheduleByMonth(entries, months).flatMap((group) => [
    ...group.slots,
    ...(group.freeEntry ? [group.freeEntry] : []),
  ]);
}

/** Pane 1: 公開予定日 + タイトル一覧（撮影スケジュールの slot から派生）。 */
export function getPublishScheduleList(
  entries: ShootingScheduleEntry[],
): PublishScheduleListItem[] {
  return entries
    .filter((e) => e.kind === "slot" && e.publishDate.trim() !== "")
    .map((e) => ({
      id: e.id,
      publishDate: e.publishDate.trim(),
      publishDateLabel: formatScheduleDateShort(e.publishDate),
      title:
        e.videoTitle.trim() ||
        e.videoContent.trim() ||
        "（タイトル未入力）",
      month: e.month,
    }))
    .sort((a, b) => a.publishDate.localeCompare(b.publishDate, "ja"));
}
