import { describe, it, expect } from "vitest";

import {
  computeCompareBenchmarks,
  computeMilestoneCompareBenchmarks,
  compareToBenchmark,
  getMilestoneMetricValue,
  getPublishedCompareRows,
  isPublishedScheduleEntry,
  parseMetricNumber,
} from "@/lib/computed/analytics-compare";
import { EMPTY_VIDEO_ANALYTICS } from "@/lib/schema";

describe("isPublishedScheduleEntry", () => {
  const base = {
    id: "x",
    month: 7,
    kind: "slot" as const,
    slotIndex: 1,
    shootDate: "",
    videoContent: "ネタ",
    videoTitle: "タイトル",
    thumbnailTitle: "",
    thumbnailImageUrl: "",
    publishDate: "2026-07-03",
    url: "",
    freeNote: "",
    analytics: EMPTY_VIDEO_ANALYTICS,
    milestones: {},
  };

  it("公開日と URL があれば公開済み", () => {
    expect(
      isPublishedScheduleEntry({
        ...base,
        url: "https://www.youtube.com/watch?v=abc12345678",
      }),
    ).toBe(true);
  });

  it("URL なしは未公開", () => {
    expect(isPublishedScheduleEntry(base)).toBe(false);
  });

  it("フリー枠は対象外", () => {
    expect(
      isPublishedScheduleEntry({ ...base, kind: "free", url: "https://youtu.be/x" }),
    ).toBe(false);
  });
});

describe("computeCompareBenchmarks", () => {
  const rows = getPublishedCompareRows([
    {
      id: "a",
      month: 7,
      kind: "slot",
      slotIndex: 1,
      shootDate: "",
      videoContent: "",
      videoTitle: "A",
      thumbnailTitle: "",
      thumbnailImageUrl: "",
      publishDate: "2026-07-03",
      url: "https://youtu.be/aaaaaaaaaaa",
      freeNote: "",
      analytics: {
        ...EMPTY_VIDEO_ANALYTICS,
        views: "1000",
        ctrPercent: "4",
        averageViewRatePercent: "40",
      },
      milestones: {
        "7d": {
          views: "800",
          impressions: "5000",
          ctrPercent: "3.5",
          computedAt: "2026-07-11T00:00:00.000Z",
        },
      },
    },
    {
      id: "b",
      month: 7,
      kind: "slot",
      slotIndex: 2,
      shootDate: "",
      videoContent: "",
      videoTitle: "B",
      thumbnailTitle: "",
      thumbnailImageUrl: "",
      publishDate: "2026-07-10",
      url: "https://youtu.be/bbbbbbbbbbb",
      freeNote: "",
      analytics: {
        ...EMPTY_VIDEO_ANALYTICS,
        views: "2000",
        ctrPercent: "6",
        averageViewRatePercent: "50",
      },
      milestones: {},
    },
  ]);

  it("全体平均を計算する", () => {
    const bench = computeCompareBenchmarks(rows, new Date("2026-07-15"));
    expect(bench.overall.views).toBe(1500);
    expect(bench.overall.ctrPercent).toBe(5);
    expect(bench.mustReach.views).toBe(1200);
    expect(bench.thisMonthLabel).toBe("7月平均");
  });

  it("7日マイルストーン平均を計算する", () => {
    const compareRows = getPublishedCompareRows([
      {
        id: "a",
        month: 7,
        kind: "slot",
        slotIndex: 1,
        shootDate: "",
        videoContent: "",
        videoTitle: "A",
        thumbnailTitle: "",
        thumbnailImageUrl: "",
        publishDate: "2026-07-03",
        url: "https://youtu.be/aaaaaaaaaaa",
        freeNote: "",
        analytics: EMPTY_VIDEO_ANALYTICS,
        milestones: {
          "7d": {
            views: "100",
            impressions: "1000",
            ctrPercent: "2.0",
            computedAt: "",
          },
        },
      },
    ]);
    const bench = computeMilestoneCompareBenchmarks(
      compareRows,
      "7d",
      new Date("2026-07-15"),
    );
    expect(bench.overall.views).toBe(100);
    expect(getMilestoneMetricValue(compareRows[0]!.milestones, "7d", "views")).toBe(
      100,
    );
  });
});

describe("parseMetricNumber", () => {
  it("カンマとパーセントを解釈", () => {
    expect(parseMetricNumber("1,280")).toBe(1280);
    expect(parseMetricNumber("4.1%")).toBe(4.1);
  });
});

describe("compareToBenchmark", () => {
  it("平均より上なら above", () => {
    expect(compareToBenchmark(110, 100)).toBe("above");
    expect(compareToBenchmark(90, 100)).toBe("below");
  });
});
