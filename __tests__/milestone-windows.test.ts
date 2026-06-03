import { describe, it, expect } from "vitest";

import {
  isMilestoneWindowDue,
  milestoneDateRange,
  milestoneEndDate,
} from "@/lib/youtube/milestone-windows";

describe("milestoneDateRange", () => {
  it("公開日からの終了日を計算する", () => {
    expect(milestoneEndDate("2026-07-03", "24h")).toBe("2026-07-04");
    expect(milestoneEndDate("2026-07-03", "3d")).toBe("2026-07-06");
    expect(milestoneEndDate("2026-07-03", "7d")).toBe("2026-07-10");
    expect(milestoneEndDate("2026-07-03", "30d")).toBe("2026-08-02");
  });

  it("3日ウィンドウの範囲", () => {
    expect(milestoneDateRange("2026-07-03", "3d")).toEqual({
      startDate: "2026-07-03",
      endDate: "2026-07-06",
    });
  });
});

describe("isMilestoneWindowDue", () => {
  it("終了日前は未到達", () => {
    expect(
      isMilestoneWindowDue("2026-07-10", "3d", new Date("2026-07-11")),
    ).toBe(false);
  });

  it("終了日以降は到達", () => {
    expect(
      isMilestoneWindowDue("2026-07-10", "3d", new Date("2026-07-13")),
    ).toBe(true);
  });
});
