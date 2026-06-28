import { describe, it, expect, vi, afterEach } from "vitest";

import {
  fetchVideoViewsInRange,
  readViewsFromReport,
} from "@/lib/youtube/analytics-views";

describe("readViewsFromReport", () => {
  it("dimensions=video の行から views を読む", () => {
    const views = readViewsFromReport({
      columnHeaders: [{ name: "video" }, { name: "views" }],
      rows: [["abc123", 128]],
    });
    expect(views).toBe(128);
  });

  it("dimensions=day の行を合計する", () => {
    const views = readViewsFromReport({
      columnHeaders: [{ name: "day" }, { name: "views" }],
      rows: [
        ["2026-06-26", 50],
        ["2026-06-27", 70],
      ],
    });
    expect(views).toBe(120);
  });
});

describe("fetchVideoViewsInRange", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dimensions=video を優先して問い合わせる", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          columnHeaders: [{ name: "video" }, { name: "views" }],
          rows: [["abc123", 99]],
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchVideoViewsInRange(
      "abc123",
      "2026-06-26",
      "2026-06-27",
      "token",
      "channel==MINE",
    );

    expect(result).toBe(99);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toContain("dimensions=video");
  });

  it("行が無いときは null", async () => {
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
});
