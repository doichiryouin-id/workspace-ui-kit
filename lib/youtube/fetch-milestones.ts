import {
  channelFilterForAnalytics,
  hasYouTubeOAuth,
  readYouTubeConfig,
  refreshYouTubeAccessToken,
} from "@/lib/youtube/oauth";
import { fetchVideoViewsInRange } from "@/lib/youtube/analytics-views";
import {
  dueMilestoneWindows,
  isDateInRange,
  isMilestoneAnalyticsLag,
  milestoneDateRange,
} from "@/lib/youtube/milestone-windows";
import {
  aggregateReachForRange,
  fetchReachDailyRows,
  type ReachDailyRow,
} from "@/lib/youtube/reporting-reach";
import { parseYouTubeVideoId } from "@/lib/youtube/video-id";
import {
  type MilestoneMap,
  type MilestoneMetrics,
  type MilestoneWindow,
} from "@/lib/schema";

export type MilestoneFetchItem = {
  id: string;
  url: string;
  publishDate: string;
};

export type MilestoneFetchResult = {
  id: string;
  videoId: string | null;
  milestones: Partial<MilestoneMap>;
  warnings: string[];
};

async function fetchViewsInRange(
  videoId: string,
  startDate: string,
  endDate: string,
  accessToken: string,
  channelFilter: string,
): Promise<number | null> {
  return fetchVideoViewsInRange(
    videoId,
    startDate,
    endDate,
    accessToken,
    channelFilter,
  );
}

function buildMilestoneMetrics(
  views: number | null,
  reach: { impressions: number; ctrPercent: string } | null,
  computedAt: string,
): MilestoneMetrics {
  return {
    views: views != null ? String(views) : "",
    impressions: reach ? String(reach.impressions) : "",
    ctrPercent: reach?.ctrPercent ?? "",
    computedAt,
  };
}

async function computeMilestonesForVideo(
  videoId: string,
  publishDate: string,
  accessToken: string,
  channelFilter: string,
  reachRows: ReachDailyRow[],
  referenceDate: Date,
): Promise<{ milestones: Partial<MilestoneMap>; warnings: string[] }> {
  const warnings: string[] = [];
  const milestones: Partial<MilestoneMap> = {};
  const due = dueMilestoneWindows(publishDate, referenceDate);
  const computedAt = new Date().toISOString();

  for (const window of due) {
    const range = milestoneDateRange(publishDate, window);
    if (!range) continue;

    let views: number | null = null;
    try {
      views = await fetchViewsInRange(
        videoId,
        range.startDate,
        range.endDate,
        accessToken,
        channelFilter,
      );
    } catch (err) {
      warnings.push(
        `${window} 視聴回数: ${
          err instanceof Error ? err.message : "取得失敗"
        }`,
      );
    }

    if (views === null) {
      if (isMilestoneAnalyticsLag(publishDate, window, referenceDate)) {
        warnings.push(
          `${window} 視聴回数: YouTube Analytics の日次反映待ち（2〜3 日後に再更新）`,
        );
      } else {
        warnings.push(
          `${window} 視聴回数: この期間の Analytics データがありません`,
        );
      }
    } else if (views === 0) {
      if (isMilestoneAnalyticsLag(publishDate, window, referenceDate)) {
        views = null;
        warnings.push(
          `${window} 視聴回数: YouTube Analytics の日次反映待ち（2〜3 日後に再更新）`,
        );
      } else {
        warnings.push(
          `${window} 視聴回数: 0（この期間に視聴が記録されていないか、Analytics の反映待ち）`,
        );
      }
    }

    const reach = aggregateReachForRange(
      reachRows,
      videoId,
      range.startDate,
      range.endDate,
    );
    if (!reach) {
      warnings.push(
        `${window} IMP/CTR: reach レポートにデータがありません（ジョブ開始前の日付の可能性）`,
      );
    }

    milestones[window] = buildMilestoneMetrics(views, reach, computedAt);
  }

  return { milestones, warnings };
}

/** 複数動画のマイルストーンを一括取得。 */
export async function fetchMilestonesBatch(
  items: MilestoneFetchItem[],
  referenceDate: Date = new Date(),
): Promise<MilestoneFetchResult[]> {
  if (!hasYouTubeOAuth()) {
    throw new Error("YouTube OAuth 未設定のためマイルストーンを取得できません");
  }

  const config = readYouTubeConfig();
  const accessToken = await refreshYouTubeAccessToken(config);
  const channelFilter = channelFilterForAnalytics(config);

  const parsed = items
    .map((item) => ({
      item,
      videoId: parseYouTubeVideoId(item.url),
    }))
    .filter((x) => x.videoId != null);

  const minPublish = parsed
    .map((x) => x.item.publishDate.trim())
    .filter(Boolean)
    .sort()[0];

  let reachRows: ReachDailyRow[] = [];
  const reachWarnings: string[] = [];
  try {
    reachRows = await fetchReachDailyRows(accessToken);
  } catch (err) {
    reachWarnings.push(
      err instanceof Error
        ? err.message
        : "YouTube reach レポートの取得に失敗",
    );
  }

  const results: MilestoneFetchResult[] = [];

  for (const { item, videoId } of parsed) {
    if (!videoId) {
      results.push({
        id: item.id,
        videoId: null,
        milestones: {},
        warnings: ["YouTube URL が不正です"],
      });
      continue;
    }

    if (!item.publishDate.trim()) {
      results.push({
        id: item.id,
        videoId,
        milestones: {},
        warnings: ["公開日が未設定です"],
      });
      continue;
    }

    const { milestones, warnings } = await computeMilestonesForVideo(
      videoId,
      item.publishDate.trim(),
      accessToken,
      channelFilter,
      reachRows,
      referenceDate,
    );

    results.push({
      id: item.id,
      videoId,
      milestones,
      warnings: [...reachWarnings, ...warnings],
    });
  }

  for (const item of items) {
    if (results.some((r) => r.id === item.id)) continue;
    results.push({
      id: item.id,
      videoId: parseYouTubeVideoId(item.url),
      milestones: {},
      warnings: ["YouTube URL が不正です"],
    });
  }

  return results;
}

/** reach 行から特定動画の最小日付を求める（テスト用）。 */
export function filterReachRowsForVideo(
  rows: ReachDailyRow[],
  videoId: string,
  startDate: string,
  endDate: string,
): ReachDailyRow[] {
  return rows.filter(
    (row) =>
      row.videoId === videoId && isDateInRange(row.date, startDate, endDate),
  );
}

export type { MilestoneWindow };
