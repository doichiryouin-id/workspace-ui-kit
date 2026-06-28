"use client";

/**
 * Pane 3: 公開後の YouTube 分析（視聴回数・インプレッション・視聴維持率等）。
 * 動画 URL から API 自動取得 + 手入力の併用。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Eye,
  MousePointerClick,
  RefreshCw,
  Timer,
} from "lucide-react";

import { formatScheduleDateShort } from "@/lib/computed/shooting-schedule";
import { PANE3_ANALYTICS } from "@/lib/labels";
import {
  type ShootingScheduleEntry,
  type VideoAnalytics,
} from "@/lib/schema";
import { parseYouTubeVideoId } from "@/lib/youtube/video-id";
import { type YouTubeAnalyticsFetchResult } from "@/lib/youtube/fetch-analytics";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  InlineFieldRow,
  InlineTextField,
  InlineTextareaField,
} from "@/components/primitives";

type VideoAnalyticsPaneProps = {
  entry: ShootingScheduleEntry | null;
  onUpdateAnalytics: (patch: Partial<VideoAnalytics>) => void;
  fetchAnalytics: (url: string) => Promise<YouTubeAnalyticsFetchResult>;
  width: number;
};

export function VideoAnalyticsPane({
  entry,
  onUpdateAnalytics,
  fetchAnalytics,
  width,
}: VideoAnalyticsPaneProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const lastAutoFetchKey = useRef<string | null>(null);
  const fetchInFlight = useRef(false);

  const runFetch = useCallback(
    async (url: string, force = false) => {
      if (!url.trim() || fetchInFlight.current) return;
      fetchInFlight.current = true;
      setLoading(true);
      setError(null);
      try {
        const result = await fetchAnalytics(url);
        onUpdateAnalytics(result.analytics);
        setWarnings(result.warnings);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : PANE3_ANALYTICS.fetchError,
        );
        if (!force) {
          // 自動取得の失敗でエンドレス再試行しない（手動「再取得」は可能）
          lastAutoFetchKey.current = `${entry?.id ?? ""}:${url}`;
        }
      } finally {
        fetchInFlight.current = false;
        setLoading(false);
      }
    },
    [entry?.id, fetchAnalytics, onUpdateAnalytics],
  );

  const entryId = entry?.id;
  const entryKind = entry?.kind;
  const entryUrl = entry?.url ?? "";
  const entryFetchedAt = entry?.analytics.fetchedAt ?? "";
  const entryViews = entry?.analytics.views ?? "";

  useEffect(() => {
    if (!entryId || entryKind === "free") return;
    const url = entryUrl.trim();
    if (!parseYouTubeVideoId(url)) return;
    if (entryFetchedAt.trim()) return;
    // 手入力済みの視聴回数は自動取得で上書きしない（「YouTube から再取得」は可）
    if (entryViews.trim()) return;

    const key = `${entryId}:${url}`;
    if (lastAutoFetchKey.current === key) return;

    lastAutoFetchKey.current = key;
    void runFetch(url);
  }, [entryId, entryKind, entryUrl, entryFetchedAt, entryViews, runFetch]);

  return (
    <section
      className="min-w-0 shrink-0 bg-canvas"
      style={{ width }}
    >
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <h2 className="text-sm font-semibold text-foreground">
          {PANE3_ANALYTICS.headerTitle}
        </h2>
        {entry && entry.kind !== "free" && entry.url.trim() ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => void runFetch(entry.url, true)}
          >
            <RefreshCw
              className={loading ? "size-3.5 animate-spin" : "size-3.5"}
              aria-hidden="true"
            />
            {loading ? PANE3_ANALYTICS.fetching : PANE3_ANALYTICS.fetchFromYouTube}
          </Button>
        ) : null}
      </header>
      <ScrollArea className="h-[calc(100%-3rem)]">
        {!entry ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">
            {PANE3_ANALYTICS.noSelection}
          </p>
        ) : entry.kind === "free" ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">
            {PANE3_ANALYTICS.freeSlotHint}
          </p>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-5 px-6 py-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              {entry.thumbnailImageUrl ? (
                <div className="shrink-0 overflow-hidden rounded-md border border-border sm:w-40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={entry.thumbnailImageUrl}
                    alt={entry.thumbnailTitle || entry.videoTitle}
                    className="aspect-video w-full object-cover"
                  />
                </div>
              ) : null}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h3 className="font-heading text-lg font-semibold text-foreground">
                  {entry.videoTitle.trim() || PANE3_ANALYTICS.untitled}
                </h3>
                {entry.publishDate.trim() ? (
                  <p className="text-sm text-muted-foreground">
                    {PANE3_ANALYTICS.publishedOn(
                      formatScheduleDateShort(entry.publishDate),
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {PANE3_ANALYTICS.notPublishedYet}
                  </p>
                )}
                {entry.analytics.fetchedAt.trim() ? (
                  <p className="text-xs text-muted-foreground">
                    {PANE3_ANALYTICS.lastFetched(entry.analytics.fetchedAt)}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {PANE3_ANALYTICS.autoFetchHint}
                  </p>
                )}
              </div>
            </div>

            {error ? (
              <p
                className="flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                <AlertCircle className="size-4 shrink-0" aria-hidden />
                {error}
              </p>
            ) : null}
            {warnings.length > 0 ? (
              <ul className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}

            <MetricGrid analytics={entry.analytics} />

            <Separator />

            <Card>
              <CardHeader className="pb-3">
                <CardTitle emphasis="prominent">
                  {PANE3_ANALYTICS.inputSection}
                </CardTitle>
                <CardDescription>{PANE3_ANALYTICS.inputHint}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <InlineFieldRow label={PANE3_ANALYTICS.views}>
                  <InlineTextField
                    value={entry.analytics.views}
                    onSave={(v) => onUpdateAnalytics({ views: v })}
                    ariaLabel={PANE3_ANALYTICS.views}
                    placeholder="1280"
                    inputType="text"
                  />
                </InlineFieldRow>
                <InlineFieldRow label={PANE3_ANALYTICS.impressions}>
                  <InlineTextField
                    value={entry.analytics.impressions}
                    onSave={(v) => onUpdateAnalytics({ impressions: v })}
                    ariaLabel={PANE3_ANALYTICS.impressions}
                    placeholder="31200"
                  />
                </InlineFieldRow>
                <InlineFieldRow label={PANE3_ANALYTICS.ctr}>
                  <InlineTextField
                    value={entry.analytics.ctrPercent}
                    onSave={(v) => onUpdateAnalytics({ ctrPercent: v })}
                    ariaLabel={PANE3_ANALYTICS.ctr}
                    placeholder="4.1"
                  />
                </InlineFieldRow>
                <InlineFieldRow label={PANE3_ANALYTICS.averageViewRate}>
                  <InlineTextField
                    value={entry.analytics.averageViewRatePercent}
                    onSave={(v) =>
                      onUpdateAnalytics({ averageViewRatePercent: v })
                    }
                    ariaLabel={PANE3_ANALYTICS.averageViewRate}
                    placeholder="41.2"
                  />
                </InlineFieldRow>
                <InlineFieldRow label={PANE3_ANALYTICS.averageViewDuration}>
                  <InlineTextField
                    value={entry.analytics.averageViewDuration}
                    onSave={(v) =>
                      onUpdateAnalytics({ averageViewDuration: v })
                    }
                    ariaLabel={PANE3_ANALYTICS.averageViewDuration}
                    placeholder="4:05"
                  />
                </InlineFieldRow>
                <Separator />
                <InlineFieldRow label={PANE3_ANALYTICS.likes}>
                  <InlineTextField
                    value={entry.analytics.likes}
                    onSave={(v) => onUpdateAnalytics({ likes: v })}
                    ariaLabel={PANE3_ANALYTICS.likes}
                    placeholder="52"
                  />
                </InlineFieldRow>
                <InlineFieldRow label={PANE3_ANALYTICS.comments}>
                  <InlineTextField
                    value={entry.analytics.comments}
                    onSave={(v) => onUpdateAnalytics({ comments: v })}
                    ariaLabel={PANE3_ANALYTICS.comments}
                    placeholder="8"
                  />
                </InlineFieldRow>
                <InlineFieldRow label={PANE3_ANALYTICS.subscribersGained}>
                  <InlineTextField
                    value={entry.analytics.subscribersGained}
                    onSave={(v) => onUpdateAnalytics({ subscribersGained: v })}
                    ariaLabel={PANE3_ANALYTICS.subscribersGained}
                    placeholder="12"
                  />
                </InlineFieldRow>
                <InlineFieldRow label={PANE3_ANALYTICS.memo}>
                  <InlineTextareaField
                    value={entry.analytics.memo}
                    onSave={(v) => onUpdateAnalytics({ memo: v })}
                    ariaLabel={PANE3_ANALYTICS.memo}
                    placeholder={PANE3_ANALYTICS.memoPlaceholder}
                  />
                </InlineFieldRow>
              </CardContent>
            </Card>
          </div>
        )}
      </ScrollArea>
    </section>
  );
}

function MetricGrid({ analytics }: { analytics: VideoAnalytics }) {
  const items = [
    {
      label: PANE3_ANALYTICS.views,
      value: formatMetric(analytics.views),
      suffix: "",
      icon: Eye,
    },
    {
      label: PANE3_ANALYTICS.impressions,
      value: formatMetric(analytics.impressions),
      suffix: "",
      icon: BarChart3,
    },
    {
      label: PANE3_ANALYTICS.ctr,
      value: formatMetric(analytics.ctrPercent),
      suffix: analytics.ctrPercent.trim() ? "%" : "",
      icon: MousePointerClick,
    },
    {
      label: PANE3_ANALYTICS.averageViewRate,
      value: formatMetric(analytics.averageViewRatePercent),
      suffix: analytics.averageViewRatePercent.trim() ? "%" : "",
      icon: Timer,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map(({ label, value, suffix, icon: Icon }) => (
        <Card key={label} size="sm">
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center gap-1.5">
              <Icon className="size-3.5 shrink-0" aria-hidden="true" />
              {label}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {value}
              {value !== "—" && suffix ? (
                <span className="ml-0.5 text-base font-medium">{suffix}</span>
              ) : null}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function formatMetric(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "—";
  const num = Number(trimmed.replace(/,/g, ""));
  if (!Number.isNaN(num) && trimmed.match(/^[\d,.]+$/)) {
    return num.toLocaleString("ja-JP");
  }
  return trimmed;
}
