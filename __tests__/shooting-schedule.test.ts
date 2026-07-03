import { describe, it, expect } from "vitest";

import {
  flattenShootingScheduleForPane2,
  getPublishScheduleList,
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

  it("Pane 2 用フラット一覧は月見出しなしで slot → フリーの順", () => {
    const parsed = shootingScheduleSchema.parse(shootingScheduleData);
    const groups = groupShootingScheduleByMonth(parsed);
    const flat = flattenShootingScheduleForPane2(parsed);
    const june = groups[0]!;

    expect(flat).toHaveLength(
      groups.reduce(
        (n, g) => n + g.slots.length + (g.freeEntry ? 1 : 0),
        0,
      ),
    );
    expect(flat[0]?.kind).toBe("slot");
    expect(flat[0]?.slotIndex).toBe(1);
    expect(flat[june.slots.length]?.kind).toBe("free");
    expect(flat[june.slots.length + 1]?.month).toBe(7);
    expect(flat[june.slots.length + 1]?.slotIndex).toBe(1);
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

describe("getPublishScheduleList", () => {
  it("Pane 2 と同様、videoTitle が空なら videoContent を Pane 1 に表示する", () => {
    const list = getPublishScheduleList([
      {
        id: "sch-06-1",
        month: 6,
        kind: "slot",
        slotIndex: 1,
        shootDate: "2026-06-10",
        videoContent: "横になる時にめまいがする",
        videoTitle: "",
        thumbnailTitle: "",
        thumbnailImageUrl: "",
        publishDate: "2026-07-03",
        url: "",
        freeNote: "",
        analytics: EMPTY_VIDEO_ANALYTICS,
      },
    ]);
    expect(list).toHaveLength(1);
    expect(list[0]?.title).toBe("横になる時にめまいがする");
    expect(list[0]?.publishDateLabel).toBe("7/3");
  });
});
