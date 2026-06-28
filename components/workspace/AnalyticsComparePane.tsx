"use client";

/**
 * Pane 4: 公開済み動画の分析比較表（折りたたみ可）。
 * 24h / 3日 / 1週間 / 1ヶ月 / 累計を横並びで表示。
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  COMPARE_METRICS,
  MILESTONE_COMPARE_METRICS,
  compareToBenchmark,
  computeCompareBenchmarks,
  computeMilestoneCompareBenchmarks,
  formatAverageCell,
  formatCompareCell,
  getMetricRawForWindow,
  getMetricValue,
  getMilestoneMetricValue,
  getPublishedCompareRows,
  isCompareCellPending,
  type CompareMetricKey,
  type CompareRow,
  type CompareBenchmarks,
  type MilestoneCompareBenchmarks,
  type MilestoneCompareMetricKey,
} from "@/lib/computed/analytics-compare";
import { PANE4_COMPARE } from "@/lib/labels";
import { type CompareWindow, type ShootingScheduleEntry } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Pane4Toggle } from "@/components/workspace/Pane4Toggle";

type AnalyticsComparePaneProps = {
  entries: ShootingScheduleEntry[];
  selectedEntryId: string | null;
  pane4Open: boolean;
  width: number;
  onTogglePane4: () => void;
  onSelectEntry: (id: string) => void;
  onSyncMilestones: () => Promise<{
    warnings: string[];
    updatedWindowCount: number;
    dueWindowCount: number;
  }>;
  milestoneSyncing: boolean;
};

type WindowColumnGroup = {
  window: CompareWindow;
  label: string;
  metrics: readonly (CompareMetricKey | MilestoneCompareMetricKey)[];
};

const WINDOW_GROUPS: WindowColumnGroup[] = [
  { window: "24h", label: PANE4_COMPARE.window24h, metrics: MILESTONE_COMPARE_METRICS },
  { window: "3d", label: PANE4_COMPARE.window3d, metrics: MILESTONE_COMPARE_METRICS },
  { window: "7d", label: PANE4_COMPARE.window7d, metrics: MILESTONE_COMPARE_METRICS },
  { window: "30d", label: PANE4_COMPARE.window30d, metrics: MILESTONE_COMPARE_METRICS },
  { window: "lifetime", label: PANE4_COMPARE.windowLifetime, metrics: COMPARE_METRICS },
];

const METRIC_SHORT: Record<
  CompareMetricKey | MilestoneCompareMetricKey,
  string
> = {
  views: PANE4_COMPARE.views,
  impressions: PANE4_COMPARE.impressions,
  ctrPercent: PANE4_COMPARE.ctr,
  averageViewRatePercent: PANE4_COMPARE.retention,
};

type BenchmarksByWindow = Record<
  CompareWindow,
  CompareBenchmarks | MilestoneCompareBenchmarks
>;

type BenchmarkRowKey = "overall" | "thisMonth" | "prevMonth" | "mustReach";

const BENCHMARK_ROWS: {
  key: BenchmarkRowKey;
  label: (b: CompareBenchmarks | MilestoneCompareBenchmarks) => string;
  muted?: boolean;
}[] = [
  { key: "overall", label: () => PANE4_COMPARE.overallAverage },
  { key: "thisMonth", label: (b) => b.thisMonthLabel },
  { key: "prevMonth", label: (b) => b.prevMonthLabel },
  { key: "mustReach", label: () => PANE4_COMPARE.mustReach, muted: true },
];

export function AnalyticsComparePane({
  entries,
  selectedEntryId,
  pane4Open,
  width,
  onTogglePane4,
  onSelectEntry,
  onSyncMilestones,
  milestoneSyncing,
}: AnalyticsComparePaneProps) {
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncWarnings, setSyncWarnings] = useState<string[]>([]);
  const [syncInfo, setSyncInfo] = useState<string | null>(null);
  const [syncInfoTone, setSyncInfoTone] = useState<
    "loading" | "success" | "info" | null
  >(null);
  const [analyticsApiReady, setAnalyticsApiReady] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    void fetch("/api/youtube-analytics/status")
      .then((res) => res.json() as Promise<{ analyticsApi?: boolean }>)
      .then((data) => setAnalyticsApiReady(Boolean(data.analyticsApi)))
      .catch(() => setAnalyticsApiReady(false));
  }, []);

  const handleSyncMilestones = useCallback(async () => {
    setSyncError(null);
    setSyncWarnings([]);
    setSyncInfo(PANE4_COMPARE.milestoneSyncing);
    setSyncInfoTone("loading");
    try {
      const outcome = await onSyncMilestones();
      const uniqueWarnings = [...new Set(outcome.warnings.filter(Boolean))];

      if (outcome.updatedWindowCount > 0) {
        setSyncInfo(
          PANE4_COMPARE.milestoneSyncSuccess(outcome.updatedWindowCount),
        );
        setSyncInfoTone("success");
      } else if (outcome.dueWindowCount === 0) {
        setSyncInfo(PANE4_COMPARE.milestoneSyncNoData);
        setSyncInfoTone("info");
      } else {
        setSyncInfo(PANE4_COMPARE.milestoneSyncEmpty);
        setSyncInfoTone("info");
      }

      setSyncWarnings(uniqueWarnings);
    } catch (err) {
      setSyncInfo(null);
      setSyncInfoTone(null);
      setSyncError(
        err instanceof Error
          ? err.message
          : PANE4_COMPARE.milestoneSyncError,
      );
    }
  }, [onSyncMilestones]);

  const rows = useMemo(() => getPublishedCompareRows(entries), [entries]);

  const benchmarksByWindow = useMemo((): BenchmarksByWindow => {
    return {
      "24h": computeMilestoneCompareBenchmarks(rows, "24h"),
      "3d": computeMilestoneCompareBenchmarks(rows, "3d"),
      "7d": computeMilestoneCompareBenchmarks(rows, "7d"),
      "30d": computeMilestoneCompareBenchmarks(rows, "30d"),
      lifetime: computeCompareBenchmarks(rows),
    };
  }, [rows]);

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-l border-border bg-background",
        "overflow-hidden transition-[width] duration-200 ease-linear",
      )}
      style={{ width }}
    >
      {pane4Open ? (
        <>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
            <h2 className="flex-1 truncate text-sm font-semibold text-foreground">
              {PANE4_COMPARE.headerTitle}
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={milestoneSyncing || rows.length === 0}
              onClick={() => void handleSyncMilestones()}
            >
              <RefreshCw
                className={
                  milestoneSyncing ? "size-3.5 animate-spin" : "size-3.5"
                }
                aria-hidden="true"
              />
              {milestoneSyncing
                ? PANE4_COMPARE.milestoneSyncing
                : PANE4_COMPARE.milestoneSync}
            </Button>
            <Pane4Toggle open={pane4Open} onToggle={onTogglePane4} />
          </header>
          <div className="flex flex-col gap-1.5 border-b border-border px-3 py-1.5">
            <p className="text-[11px] text-muted-foreground">
              {PANE4_COMPARE.milestoneHintHorizontal}
            </p>
            {analyticsApiReady === false ? (
              <p
                className="flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-[11px] text-destructive"
                role="alert"
              >
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {PANE4_COMPARE.milestoneOAuthMissing}
              </p>
            ) : null}
            {syncError ? (
              <p
                className="flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-[11px] text-destructive"
                role="alert"
              >
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {syncError}
              </p>
            ) : null}
            {syncInfo ? (
              <p
                className={cn(
                  "rounded-md px-2 py-1.5 text-[11px]",
                  syncInfoTone === "loading" &&
                    "bg-muted/40 text-muted-foreground",
                  syncInfoTone === "success" &&
                    "border border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300",
                  syncInfoTone === "info" &&
                    "border border-border bg-muted/30 text-muted-foreground",
                )}
                role="status"
              >
                {syncInfo}
              </p>
            ) : null}
            {syncWarnings.length > 0 ? (
              <ul className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1.5 text-[11px] text-amber-900 dark:text-amber-200">
                {syncWarnings.map((warning, index) => (
                  <li key={`${index}-${warning}`}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </div>
          <ScrollArea className="min-h-0 flex-1">
            {rows.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                {PANE4_COMPARE.empty}
              </p>
            ) : (
              <div className="min-w-max pb-4">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th
                        rowSpan={2}
                        className="sticky left-0 z-30 min-w-[64px] border-r border-border bg-muted/40 px-2 py-2 text-left font-medium text-muted-foreground"
                      >
                        {PANE4_COMPARE.publishDate}
                      </th>
                      <th
                        rowSpan={2}
                        className="sticky left-[64px] z-30 min-w-[120px] max-w-[160px] border-r border-border bg-muted/40 px-2 py-2 text-left font-medium text-muted-foreground"
                      >
                        {PANE4_COMPARE.title}
                      </th>
                      {WINDOW_GROUPS.map((group) => (
                        <th
                          key={group.window}
                          colSpan={group.metrics.length}
                          className="border-l border-border px-2 py-1.5 text-center font-semibold text-foreground"
                        >
                          {group.label}
                        </th>
                      ))}
                    </tr>
                    <tr className="border-b border-border bg-muted/30">
                      {WINDOW_GROUPS.flatMap((group) =>
                        group.metrics.map((metric) => (
                          <th
                            key={`${group.window}-${metric}`}
                            className={cn(
                              "min-w-[52px] px-1.5 py-1 text-right font-medium text-muted-foreground",
                              metric === group.metrics[0] &&
                                "border-l border-border",
                            )}
                          >
                            {METRIC_SHORT[metric]}
                          </th>
                        )),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {BENCHMARK_ROWS.map(({ key, label, muted }) => {
                      const sampleBench = benchmarksByWindow["7d"];
                      return (
                        <tr
                          key={key}
                          className={cn(
                            "border-b border-border bg-amber-500/5",
                            muted && "bg-muted/30",
                          )}
                        >
                          <td
                            colSpan={2}
                            className="sticky left-0 z-20 border-r border-border bg-inherit px-2 py-1.5 font-medium text-foreground"
                          >
                            {label(sampleBench)}
                          </td>
                          {WINDOW_GROUPS.flatMap((group) => {
                            const bench = benchmarksByWindow[group.window];
                            const averages =
                              key === "overall"
                                ? bench.overall
                                : key === "thisMonth"
                                  ? bench.thisMonth
                                  : key === "prevMonth"
                                    ? bench.prevMonth
                                    : bench.mustReach;
                            return group.metrics.map((metric, idx) => (
                              <td
                                key={`${key}-${group.window}-${metric}`}
                                className={cn(
                                  "px-1.5 py-1.5 text-right tabular-nums text-muted-foreground",
                                  idx === 0 && "border-l border-border",
                                )}
                              >
                                {formatAverageCell(
                                  averages[metric as keyof typeof averages] ??
                                    null,
                                  metric,
                                )}
                              </td>
                            ));
                          })}
                        </tr>
                      );
                    })}
                    {rows.map((row) => (
                      <CompareDataRow
                        key={row.id}
                        row={row}
                        selected={row.id === selectedEntryId}
                        benchmarksByWindow={benchmarksByWindow}
                        onSelect={() => onSelectEntry(row.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </>
      ) : (
        <div className="flex h-12 shrink-0 items-center justify-center border-b border-border">
          <Pane4Toggle open={pane4Open} onToggle={onTogglePane4} />
        </div>
      )}
    </aside>
  );
}

function CompareDataRow({
  row,
  selected,
  benchmarksByWindow,
  onSelect,
}: {
  row: CompareRow;
  selected: boolean;
  benchmarksByWindow: BenchmarksByWindow;
  onSelect: () => void;
}) {
  return (
    <tr
      className={cn(
        "cursor-pointer border-b border-border transition-colors hover:bg-accent/30",
        selected && "bg-accent/20",
      )}
      onClick={onSelect}
    >
      <td className="sticky left-0 z-10 border-r border-border bg-background px-2 py-2 tabular-nums text-foreground">
        {row.publishLabel}
      </td>
      <td className="sticky left-[64px] z-10 max-w-[160px] border-r border-border bg-background px-2 py-2">
        <div className="flex items-center gap-2">
          {row.thumbnailImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.thumbnailImageUrl}
              alt=""
              className="size-7 shrink-0 rounded object-cover"
            />
          ) : null}
          <span className="line-clamp-2 text-foreground">{row.title}</span>
        </div>
      </td>
      {WINDOW_GROUPS.flatMap((group) => {
        const overall = benchmarksByWindow[group.window].overall;
        const isLifetime = group.window === "lifetime";
        const pending =
          !isLifetime && isCompareCellPending(row, group.window);

        return group.metrics.map((metric, idx) => {
          const raw = getMetricRawForWindow(row, group.window, metric);
          const value =
            isLifetime
              ? getMetricValue(row.analytics, metric as CompareMetricKey)
              : getMilestoneMetricValue(
                  row.milestones,
                  group.window as Exclude<CompareWindow, "lifetime">,
                  metric as MilestoneCompareMetricKey,
                );
          const benchmark =
            overall[metric as keyof typeof overall] ?? null;
          const tone = pending
            ? "empty"
            : compareToBenchmark(value, benchmark as number | null);

          return (
            <td
              key={`${row.id}-${group.window}-${metric}`}
              className={cn(
                "px-1.5 py-2 text-right tabular-nums",
                idx === 0 && "border-l border-border",
                tone === "above" &&
                  "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
                tone === "below" &&
                  "bg-red-500/10 text-red-800 dark:text-red-300",
                pending && "text-muted-foreground",
              )}
            >
              {pending
                ? PANE4_COMPARE.pending
                : formatCompareCell(raw, metric)}
            </td>
          );
        });
      })}
    </tr>
  );
}
