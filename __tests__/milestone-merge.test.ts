import { describe, it, expect } from "vitest";

import { mergeMilestoneMaps } from "@/lib/computed/milestone-merge";

describe("mergeMilestoneMaps", () => {
  it("空の取得結果で既存の視聴回数を消さない", () => {
    const merged = mergeMilestoneMaps(
      {
        "24h": {
          views: "120",
          impressions: "",
          ctrPercent: "",
          computedAt: "2026-06-28T00:00:00.000Z",
        },
      },
      {
        "24h": {
          views: "",
          impressions: "",
          ctrPercent: "",
          computedAt: "2026-06-28T01:00:00.000Z",
        },
      },
    );

    expect(merged["24h"]?.views).toBe("120");
    expect(merged["24h"]?.computedAt).toBe("2026-06-28T01:00:00.000Z");
  });

  it("新しい非空の値で上書きする", () => {
    const merged = mergeMilestoneMaps(
      {
        "24h": {
          views: "120",
          impressions: "",
          ctrPercent: "",
          computedAt: "",
        },
      },
      {
        "24h": {
          views: "150",
          impressions: "1000",
          ctrPercent: "4.2",
          computedAt: "2026-06-28T02:00:00.000Z",
        },
      },
    );

    expect(merged["24h"]?.views).toBe("150");
    expect(merged["24h"]?.impressions).toBe("1000");
  });
});
