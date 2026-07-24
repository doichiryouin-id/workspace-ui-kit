import { describe, it, expect, vi } from "vitest";

import { EMPTY_VIDEO_ANALYTICS, type ShootingScheduleEntry } from "@/lib/schema";
import { type WorkspaceSnapshot } from "@/lib/workspace-sync/types";
import {
  applyYouTubePatchesToSchedule,
  mergeAnalyticsPatch,
  syncWorkspaceYouTubeAnalytics,
  type SyncWorkspaceYouTubeDeps,
} from "@/lib/youtube/sync-workspace-analytics";

function slot(partial: Partial<ShootingScheduleEntry> & { id: string }): ShootingScheduleEntry {
  return {
    id: partial.id,
    month: 7,
    kind: "slot",
    slotIndex: 1,
    shootDate: "",
    videoContent: "",
    videoTitle: partial.videoTitle ?? "title",
    thumbnailTitle: "",
    thumbnailImageUrl: "",
    publishDate: partial.publishDate ?? "2026-07-03",
    url: partial.url ?? "",
    freeNote: "",
    analytics: partial.analytics ?? { ...EMPTY_VIDEO_ANALYTICS },
    milestones: partial.milestones ?? {},
  };
}

function snapshot(schedule: ShootingScheduleEntry[]): WorkspaceSnapshot {
  return {
    channels: [],
    videoPlans: [],
    shootingSchedule: schedule,
    workspace: {
      name: "test",
      icon: "",
    },
  };
}

describe("mergeAnalyticsPatch", () => {
  it("空の IMP/CTR で既存の手入力を消さない", () => {
    const existing = {
      ...EMPTY_VIDEO_ANALYTICS,
      views: "10",
      impressions: "1000",
      ctrPercent: "4.0",
    };
    const merged = mergeAnalyticsPatch(existing, {
      views: "20",
      impressions: "",
      ctrPercent: "",
      fetchedAt: "2026-07-24T00:00:00.000Z",
    });
    expect(merged.views).toBe("20");
    expect(merged.impressions).toBe("1000");
    expect(merged.ctrPercent).toBe("4.0");
  });
});

describe("applyYouTubePatchesToSchedule", () => {
  it("URL なし枠はパッチ対象外のまま", () => {
    const schedule = [
      slot({ id: "a", url: "", publishDate: "2026-07-03" }),
      slot({
        id: "b",
        url: "https://youtu.be/abcdefghijk",
        publishDate: "2026-07-03",
      }),
    ];
    const patches = new Map([
      [
        "b",
        {
          analytics: { views: "99", fetchedAt: "t" },
          milestones: {
            "24h": {
              views: "5",
              impressions: "10",
              ctrPercent: "1.0",
              computedAt: "t",
            },
          },
        },
      ],
    ]);

    const next = applyYouTubePatchesToSchedule(schedule, patches);
    expect(next[0]!.analytics.views).toBe("");
    expect(next[1]!.analytics.views).toBe("99");
    expect(next[1]!.milestones["24h"]?.views).toBe("5");
  });
});

describe("syncWorkspaceYouTubeAnalytics", () => {
  it("公開済みだけ取得し、競合時はリトライして保存する", async () => {
    const published = slot({
      id: "pub",
      url: "https://youtu.be/abcdefghijk",
      publishDate: "2026-06-26",
      analytics: { ...EMPTY_VIDEO_ANALYTICS, impressions: "500" },
    });
    const draft = slot({
      id: "draft",
      url: "",
      publishDate: "2026-08-01",
    });

    let saveCalls = 0;
    const load = vi
      .fn()
      .mockResolvedValueOnce({
        data: snapshot([published, draft]),
        updatedAt: "2026-07-24T00:00:00.000Z",
      })
      .mockResolvedValue({
        data: snapshot([
          {
            ...published,
            videoTitle: "edited-by-client",
          },
          draft,
        ]),
        updatedAt: "2026-07-24T00:01:00.000Z",
      });

    const save = vi.fn().mockImplementation(async () => {
      saveCalls += 1;
      if (saveCalls === 1) {
        return { updatedAt: "2026-07-24T00:01:00.000Z", conflict: true };
      }
      return { updatedAt: "2026-07-24T00:02:00.000Z", conflict: false };
    });

    const fetchMilestones = vi.fn().mockResolvedValue([
      {
        id: "pub",
        videoId: "abcdefghijk",
        milestones: {
          "7d": {
            views: "100",
            impressions: "200",
            ctrPercent: "3.0",
            computedAt: "t",
          },
        },
        warnings: [],
      },
    ]);

    const fetchAnalytics = vi.fn().mockResolvedValue({
      videoId: "abcdefghijk",
      analytics: {
        views: "999",
        impressions: "",
        ctrPercent: "",
        fetchedAt: "t",
      },
      fetchedAt: "t",
      sources: { dataApi: true, analyticsApi: false },
      warnings: [],
    });

    const deps: SyncWorkspaceYouTubeDeps = {
      load,
      save,
      fetchMilestones,
      fetchAnalytics,
    };

    const result = await syncWorkspaceYouTubeAnalytics(deps);

    expect(result.saved).toBe(true);
    expect(result.publishedCount).toBe(1);
    expect(result.updatedEntryCount).toBe(1);
    expect(result.updatedWindowCount).toBe(1);
    expect(fetchMilestones).toHaveBeenCalledTimes(1);
    expect(fetchAnalytics).toHaveBeenCalledWith("https://youtu.be/abcdefghijk", {
      publishDate: "2026-06-26",
      skipReach: true,
    });
    expect(save).toHaveBeenCalledTimes(2);

    const savedSnapshot = save.mock.calls[1]![0] as WorkspaceSnapshot;
    const savedPub = savedSnapshot.shootingSchedule.find((e) => e.id === "pub");
    expect(savedPub?.videoTitle).toBe("edited-by-client");
    expect(savedPub?.analytics.views).toBe("999");
    expect(savedPub?.analytics.impressions).toBe("500");
    expect(savedPub?.milestones["7d"]?.views).toBe("100");
  });

  it("ワークスペース空なら保存しない", async () => {
    const result = await syncWorkspaceYouTubeAnalytics({
      load: async () => null,
      save: async () => ({ updatedAt: "", conflict: false }),
      fetchMilestones: async () => [],
      fetchAnalytics: async () => {
        throw new Error("should not run");
      },
    });
    expect(result.saved).toBe(false);
    expect(result.errors[0]).toMatch(/空|未設定/);
  });
});
