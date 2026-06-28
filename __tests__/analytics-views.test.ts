import { describe, it, expect, vi, afterEach } from "vitest";

import { fetchVideoViewsInRange } from "@/lib/youtube/analytics-views";

describe("fetchVideoViewsInRange", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("行が無いときは null（0 視聴と区別）", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          columnHeaders: [{ name: "views" }],
          rows: [],
        }),
      }),
    );

    const result = await fetchVideoViewsInRange(
      "abc123",
      "2026-06-26",
      "2026-06-27",
      "token",
      "channel==MINE",
    );

    expect(result).toBeNull();
  });

  it("views 列があるときは数値を返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          columnHeaders: [{ name: "views" }],
          rows: [[42]],
        }),
      }),
    );

    const result = await fetchVideoViewsInRange(
      "abc123",
      "2026-06-26",
      "2026-06-27",
      "token",
      "channel==MINE",
    );

    expect(result).toBe(42);
  });
});
