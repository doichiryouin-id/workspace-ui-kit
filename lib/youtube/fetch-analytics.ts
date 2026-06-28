import {
  formatIso8601Duration,
  formatSecondsDuration,
} from "@/lib/youtube/format";
import {
  channelFilterForAnalytics,
  hasYouTubeOAuth,
  readYouTubeConfig,
  refreshYouTubeAccessToken,
} from "@/lib/youtube/oauth";
import { fetchLifetimeVideoViews } from "@/lib/youtube/analytics-views";
import {
  aggregateReachForRange,
  aggregateReachLifetimeForVideo,
  fetchReachDailyRows,
  REACH_REPORT_FILES_PANE3,
  ReachQuotaExceededError,
} from "@/lib/youtube/reporting-reach";
import { PANE3_ANALYTICS } from "@/lib/labels";
import { parseYouTubeVideoId } from "@/lib/youtube/video-id";
import { type VideoAnalytics } from "@/lib/schema";

export type YouTubeAnalyticsFetchOptions = {
  /** 累計 IMP/CTR の集計開始日（公開日）。未指定時はレポート全体。 */
  publishDate?: string;
  /** 手入力済み IMP/CTR があるとき reach API を呼ばない。 */
  skipReach?: boolean;
};

export type YouTubeAnalyticsFetchResult = {
  videoId: string;
  analytics: Partial<VideoAnalytics>;
  fetchedAt: string;
  sources: {
    dataApi: boolean;
    analyticsApi: boolean;
  };
  warnings: string[];
};

async function fetchDataApiStats(
  videoId: string,
  apiKey: string,
): Promise<Partial<VideoAnalytics>> {
  const params = new URLSearchParams({
    part: "statistics,contentDetails",
    id: videoId,
    key: apiKey,
  });

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?${params}`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    throw new Error(`YouTube Data API エラー（${res.status}）`);
  }

  const json = (await res.json()) as {
    items?: Array<{
      statistics?: {
        viewCount?: string;
        likeCount?: string;
        commentCount?: string;
      };
      contentDetails?: { duration?: string };
    }>;
  };

  const item = json.items?.[0];
  if (!item) {
    throw new Error("動画が見つかりません（非公開または ID 不正）");
  }

  const stats = item.statistics ?? {};
  const duration = item.contentDetails?.duration;

  return {
    views: stats.viewCount ?? "",
    likes: stats.likeCount ?? "",
    comments: stats.commentCount ?? "",
    ...(duration ? { memo: `動画尺 ${formatIso8601Duration(duration)}` } : {}),
  };
}

type AnalyticsReport = {
  columnHeaders?: Array<{ name?: string }>;
  rows?: Array<Array<string | number>>;
};

async function fetchAnalyticsApiMetrics(
  videoId: string,
  config: ReturnType<typeof readYouTubeConfig>,
): Promise<Partial<VideoAnalytics>> {
  const accessToken = await refreshYouTubeAccessToken(config);
  const channelFilter = channelFilterForAnalytics(config);

  const endDate = new Date().toISOString().slice(0, 10);
  const params = new URLSearchParams({
    ids: channelFilter,
    startDate: "2020-01-01",
    endDate,
    metrics:
      "averageViewDuration,averageViewPercentage,subscribersGained",
    dimensions: "video",
    filters: `video==${videoId}`,
  });

  const res = await fetch(
    `https://youtubeanalytics.googleapis.com/v2/reports?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `YouTube Analytics API エラー（${res.status}）: ${body.slice(0, 200)}`,
    );
  }

  const report = (await res.json()) as AnalyticsReport;
  const headers = report.columnHeaders?.map((h) => h.name ?? "") ?? [];
  const row = report.rows?.[0];
  if (!row) {
    return {};
  }

  const byName = Object.fromEntries(
    headers.map((name, i) => [name, row[i]]),
  ) as Record<string, string | number>;

  const patch: Partial<VideoAnalytics> = {};

  if (byName.averageViewPercentage != null) {
    patch.averageViewRatePercent = Number(
      byName.averageViewPercentage,
    ).toFixed(1);
  }
  if (byName.averageViewDuration != null) {
    patch.averageViewDuration = formatSecondsDuration(
      Number(byName.averageViewDuration),
    );
  }
  if (byName.subscribersGained != null) {
    patch.subscribersGained = String(byName.subscribersGained);
  }

  return patch;
}

async function fetchReachLifetimeMetrics(
  videoId: string,
  accessToken: string,
  publishDate?: string,
): Promise<Partial<VideoAnalytics>> {
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = publishDate?.trim() || "2020-01-01";
  // レポートファイルは minDate で絞らない（公開日より前に開始した CSV にデータがあるため）
  const rows = await fetchReachDailyRows(accessToken, {
    maxReportFiles: REACH_REPORT_FILES_PANE3,
  });
  let reach =
    aggregateReachForRange(rows, videoId, startDate, endDate) ??
    aggregateReachLifetimeForVideo(rows, videoId);
  if (!reach) return {};

  return {
    impressions: String(reach.impressions),
    ctrPercent: reach.ctrPercent,
  };
}

/** URL から YouTube 分析数値を取得（Data API + Analytics API + reach レポート）。 */
export async function fetchYouTubeAnalytics(
  urlOrId: string,
  options: YouTubeAnalyticsFetchOptions = {},
): Promise<YouTubeAnalyticsFetchResult> {
  const videoId = parseYouTubeVideoId(urlOrId);
  if (!videoId) {
    throw new Error("YouTube 動画 URL または 11 文字の ID を指定してください");
  }

  const config = readYouTubeConfig();
  const warnings: string[] = [];
  const analytics: Partial<VideoAnalytics> = {};
  let dataApi = false;
  let analyticsApi = false;

  if (config.apiKey) {
    try {
      Object.assign(analytics, await fetchDataApiStats(videoId, config.apiKey));
      dataApi = true;
    } catch (err) {
      warnings.push(
        err instanceof Error ? err.message : "YouTube Data API の取得に失敗",
      );
    }
  } else {
    warnings.push(
      "YOUTUBE_API_KEY 未設定のため視聴回数・高評価等は取得できません",
    );
  }

  const hasOAuth = hasYouTubeOAuth(config);

  if (hasOAuth) {
    try {
      const accessToken = await refreshYouTubeAccessToken(config);
      const channelFilter = channelFilterForAnalytics(config);
      Object.assign(
        analytics,
        await fetchAnalyticsApiMetrics(videoId, config),
      );
      // 視聴回数は Data API を優先。API キーが無いときだけ OAuth 累計を使う。
      if (!dataApi) {
        const views = await fetchLifetimeVideoViews(
          videoId,
          accessToken,
          channelFilter,
        );
        if (views != null) {
          analytics.views = String(views);
        }
      }

      if (!options.skipReach) {
        try {
          Object.assign(
            analytics,
            await fetchReachLifetimeMetrics(
              videoId,
              accessToken,
              options.publishDate,
            ),
          );
        } catch (err) {
          if (err instanceof ReachQuotaExceededError) {
            warnings.push(PANE3_ANALYTICS.reachQuotaWarning);
          } else {
            warnings.push(
              err instanceof Error
                ? err.message
                : "YouTube reach レポート（IMP/CTR）の取得に失敗",
            );
          }
        }

        const reachQuotaHit = warnings.includes(PANE3_ANALYTICS.reachQuotaWarning);
        if (
          !reachQuotaHit &&
          !analytics.impressions?.trim() &&
          !analytics.ctrPercent?.trim()
        ) {
          warnings.push(PANE3_ANALYTICS.reachEmptyWarning);
        }
      }

      analyticsApi = true;
    } catch (err) {
      warnings.push(
        err instanceof Error
          ? err.message
          : "YouTube Analytics API の取得に失敗",
      );
    }
  } else {
    warnings.push(
      "OAuth 未設定のためインプレッション・CTR・平均視聴率は取得できません（.env.example 参照）",
    );
  }

  if (!dataApi && !analyticsApi) {
    throw new Error(
      warnings.join(" ") ||
        "YouTube API の設定がありません。.env.local を確認してください",
    );
  }

  const fetchedAt = new Date().toISOString();
  analytics.fetchedAt = fetchedAt;
  analytics.memo = analytics.memo
    ? `${analytics.memo} · API ${fetchedAt.slice(0, 10)}`
    : `API 取得 ${fetchedAt.slice(0, 16).replace("T", " ")}`;

  return {
    videoId,
    analytics,
    fetchedAt,
    sources: { dataApi, analyticsApi },
    warnings,
  };
}
