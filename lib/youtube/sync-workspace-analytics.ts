/**
 * 公開済み撮影枠の YouTube 数値を取得し、workspace_state に直接反映する。
 * Vercel Cron / 手動 API から利用。
 */

import { isPublishedScheduleEntry } from "@/lib/computed/analytics-compare";
import { mergeMilestoneMaps } from "@/lib/computed/milestone-merge";
import {
  loadWorkspaceSnapshot,
  saveWorkspaceSnapshot,
} from "@/lib/supabase/workspace-store";
import {
  type MilestoneMap,
  type ShootingScheduleEntry,
  type VideoAnalytics,
} from "@/lib/schema";
import { type WorkspaceSnapshot } from "@/lib/workspace-sync/types";
import { fetchYouTubeAnalytics } from "@/lib/youtube/fetch-analytics";
import {
  fetchMilestonesBatch,
  type MilestoneFetchResult,
} from "@/lib/youtube/fetch-milestones";

const MAX_SAVE_ATTEMPTS = 3;

export type EntryYouTubePatch = {
  analytics?: Partial<VideoAnalytics>;
  milestones?: Partial<MilestoneMap>;
};

export type SyncWorkspaceYouTubeResult = {
  publishedCount: number;
  updatedEntryCount: number;
  updatedWindowCount: number;
  warnings: string[];
  errors: string[];
  saved: boolean;
  updatedAt: string | null;
};

export type SyncWorkspaceYouTubeDeps = {
  load: typeof loadWorkspaceSnapshot;
  save: typeof saveWorkspaceSnapshot;
  fetchMilestones: typeof fetchMilestonesBatch;
  fetchAnalytics: typeof fetchYouTubeAnalytics;
};

const defaultDeps: SyncWorkspaceYouTubeDeps = {
  load: loadWorkspaceSnapshot,
  save: saveWorkspaceSnapshot,
  fetchMilestones: fetchMilestonesBatch,
  fetchAnalytics: fetchYouTubeAnalytics,
};

/** 空の取得値で手入力 IMP/CTR を消さない（Pane 3 と同じ方針）。 */
export function mergeAnalyticsPatch(
  existing: VideoAnalytics,
  patch: Partial<VideoAnalytics>,
): VideoAnalytics {
  const next: VideoAnalytics = { ...existing, ...patch };

  if (!patch.impressions?.trim() && existing.impressions.trim()) {
    next.impressions = existing.impressions;
  }
  if (!patch.ctrPercent?.trim() && existing.ctrPercent.trim()) {
    next.ctrPercent = existing.ctrPercent;
  }

  return next;
}

export function countUpdatedMilestoneWindows(
  patch: Partial<MilestoneMap>,
): number {
  let count = 0;
  for (const snapshot of Object.values(patch)) {
    if (!snapshot) continue;
    if (
      snapshot.views.trim() ||
      snapshot.impressions.trim() ||
      snapshot.ctrPercent.trim()
    ) {
      count += 1;
    }
  }
  return count;
}

/** 取得結果を shootingSchedule にだけマージ（他フィールドは現状維持）。 */
export function applyYouTubePatchesToSchedule(
  schedule: ShootingScheduleEntry[],
  patches: Map<string, EntryYouTubePatch>,
): ShootingScheduleEntry[] {
  return schedule.map((entry) => {
    const patch = patches.get(entry.id);
    if (!patch) return entry;

    let next = entry;
    if (patch.milestones) {
      next = {
        ...next,
        milestones: mergeMilestoneMaps(next.milestones ?? {}, patch.milestones),
      };
    }
    if (patch.analytics) {
      next = {
        ...next,
        analytics: mergeAnalyticsPatch(next.analytics, patch.analytics),
      };
    }
    return next;
  });
}

export function applyYouTubePatchesToSnapshot(
  snapshot: WorkspaceSnapshot,
  patches: Map<string, EntryYouTubePatch>,
): WorkspaceSnapshot {
  return {
    ...snapshot,
    shootingSchedule: applyYouTubePatchesToSchedule(
      snapshot.shootingSchedule,
      patches,
    ),
  };
}

async function collectPatches(
  published: ShootingScheduleEntry[],
  deps: SyncWorkspaceYouTubeDeps,
): Promise<{
  patches: Map<string, EntryYouTubePatch>;
  warnings: string[];
  errors: string[];
  updatedWindowCount: number;
}> {
  const patches = new Map<string, EntryYouTubePatch>();
  const warnings: string[] = [];
  const errors: string[] = [];
  let updatedWindowCount = 0;

  if (published.length === 0) {
    return { patches, warnings, errors, updatedWindowCount };
  }

  let milestoneResults: MilestoneFetchResult[] = [];
  try {
    milestoneResults = await deps.fetchMilestones(
      published.map((e) => ({
        id: e.id,
        url: e.url.trim(),
        publishDate: e.publishDate.trim(),
      })),
    );
  } catch (err) {
    errors.push(
      err instanceof Error
        ? `マイルストーン一括取得: ${err.message}`
        : "マイルストーン一括取得に失敗しました",
    );
  }

  for (const result of milestoneResults) {
    warnings.push(...(result.warnings ?? []));
    const windowCount = countUpdatedMilestoneWindows(result.milestones);
    updatedWindowCount += windowCount;
    if (Object.keys(result.milestones).length === 0) continue;
    const existing = patches.get(result.id) ?? {};
    patches.set(result.id, {
      ...existing,
      milestones: result.milestones,
    });
  }

  for (const entry of published) {
    try {
      const result = await deps.fetchAnalytics(entry.url.trim(), {
        publishDate: entry.publishDate.trim() || undefined,
        skipReach: true,
      });
      warnings.push(...result.warnings);
      const existing = patches.get(entry.id) ?? {};
      patches.set(entry.id, {
        ...existing,
        analytics: result.analytics,
      });
    } catch (err) {
      errors.push(
        `${entry.id}: ${
          err instanceof Error ? err.message : "分析データの取得に失敗"
        }`,
      );
    }
  }

  return { patches, warnings, errors, updatedWindowCount };
}

/** クラウド上のワークスペースに YouTube 最新値を反映する。 */
export async function syncWorkspaceYouTubeAnalytics(
  deps: SyncWorkspaceYouTubeDeps = defaultDeps,
): Promise<SyncWorkspaceYouTubeResult> {
  const first = await deps.load();
  if (!first) {
    return {
      publishedCount: 0,
      updatedEntryCount: 0,
      updatedWindowCount: 0,
      warnings: [],
      errors: ["ワークスペースが空、または Supabase が未設定です"],
      saved: false,
      updatedAt: null,
    };
  }

  const published = first.data.shootingSchedule.filter(isPublishedScheduleEntry);
  const { patches, warnings, errors, updatedWindowCount } = await collectPatches(
    published,
    deps,
  );

  if (patches.size === 0) {
    return {
      publishedCount: published.length,
      updatedEntryCount: 0,
      updatedWindowCount,
      warnings: [...new Set(warnings)],
      errors,
      saved: false,
      updatedAt: first.updatedAt,
    };
  }

  let lastUpdatedAt = first.updatedAt;
  for (let attempt = 0; attempt < MAX_SAVE_ATTEMPTS; attempt += 1) {
    const loaded = attempt === 0 ? first : await deps.load();
    if (!loaded) {
      errors.push("保存前にワークスペースが消えています");
      break;
    }

    const next = applyYouTubePatchesToSnapshot(loaded.data, patches);
    const saveResult = await deps.save(next, loaded.updatedAt);
    lastUpdatedAt = saveResult.updatedAt;

    if (!saveResult.conflict) {
      return {
        publishedCount: published.length,
        updatedEntryCount: patches.size,
        updatedWindowCount,
        warnings: [...new Set(warnings)],
        errors,
        saved: true,
        updatedAt: saveResult.updatedAt,
      };
    }
  }

  errors.push(
    "クラウド保存が競合しました。しばらくしてから再実行してください",
  );
  return {
    publishedCount: published.length,
    updatedEntryCount: patches.size,
    updatedWindowCount,
    warnings: [...new Set(warnings)],
    errors,
    saved: false,
    updatedAt: lastUpdatedAt,
  };
}
