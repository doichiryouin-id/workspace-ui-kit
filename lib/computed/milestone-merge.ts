import {
  type MilestoneMap,
  type MilestoneWindow,
  type MilestoneMetrics,
} from "@/lib/schema";

const MILESTONE_WINDOWS: MilestoneWindow[] = ["24h", "3d", "7d", "30d"];

function pickMetric(
  incoming: string | undefined,
  previous: string | undefined,
): string {
  const next = incoming?.trim() ?? "";
  if (next) return next;
  return previous?.trim() ?? "";
}

function mergeSnapshot(
  previous: MilestoneMetrics | undefined,
  incoming: MilestoneMetrics,
): MilestoneMetrics {
  return {
    views: pickMetric(incoming.views, previous?.views),
    impressions: pickMetric(incoming.impressions, previous?.impressions),
    ctrPercent: pickMetric(incoming.ctrPercent, previous?.ctrPercent),
    computedAt: incoming.computedAt.trim() || previous?.computedAt || "",
  };
}

/** マイルストーン同期結果をマージ（空文字で既存の数値を消さない）。 */
export function mergeMilestoneMaps(
  existing: MilestoneMap,
  patch: Partial<MilestoneMap>,
): MilestoneMap {
  const next: MilestoneMap = { ...existing };

  for (const window of MILESTONE_WINDOWS) {
    const incoming = patch[window];
    if (!incoming) continue;
    next[window] = mergeSnapshot(next[window], incoming);
  }

  return next;
}
