import { describe, it, expect } from "vitest";

import {
  groupShootingScheduleByMonth,
  isShootingEntryFilled,
} from "@/lib/computed/shooting-schedule";
import { shootingScheduleSchema, EMPTY_VIDEO_ANALYTICS } from "@/lib/schema";

import shootingScheduleData from "@/data/shooting-schedule.json";

describe("shooting-schedule.json", () => {
  it("shootingScheduleSchema を満たす", () => {
    const result = shootingScheduleSchema.safeParse(shootingScheduleData);
    expect(result.success).toBe(true);
  });

  it("6〜12月・月4枠 + フリー枠を含む", () => {
    const groups = groupShootingScheduleByMonth(
      shootingScheduleSchema.parse(shootingScheduleData),
    );
    expect(groups).toHaveLength(7);
    expect(groups[0]?.month).toBe(6);
    expect(groups[0]?.slots).toHaveLength(8);
    expect(groups[0]?.freeEntry).not.toBeNull();
    expect(groups.reduce((n, g) => n + g.slots.length, 0)).toBe(32);
  });
});

describe("isShootingEntryFilled", () => {
  const base = {
    id: "x",
    month: 6,
    kind: "slot" as const,
    slotIndex: 1,
    shootDate: "",
    videoContent: "",
    videoTitle: "",
    thumbnailTitle: "",
    thumbnailImageUrl: "",
    publishDate: "",
    url: "",
    freeNote: "",
    analytics: EMPTY_VIDEO_ANALYTICS,
  };

  it("タイトルまたは内容があれば入力済", () => {
    expect(
      isShootingEntryFilled({ ...base, videoTitle: "テスト" }),
    ).toBe(true);
    expect(
      isShootingEntryFilled({ ...base, videoContent: "概要" }),
    ).toBe(true);
    expect(isShootingEntryFilled(base)).toBe(false);
  });
});
