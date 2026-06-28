"use client";

/**
 * Workspace: 4 ペイン（公開予定 / 撮影スケジュール / 分析 / 比較表）。
 */

import { useState, useCallback, useMemo, type CSSProperties } from "react";

import { useWorkspaceSync } from "@/hooks/useWorkspaceSync";
import {
  PANE4_COLLAPSED_WIDTH,
  useWorkspacePaneWidths,
  type PaneWidthKey,
} from "@/hooks/useWorkspacePaneWidths";
import { mergeMilestoneMaps } from "@/lib/computed/milestone-merge";
import { isPublishedScheduleEntry } from "@/lib/computed/analytics-compare";
import { dueMilestoneWindows } from "@/lib/youtube/milestone-windows";
import {
  type Channel,
  type VideoPlan,
  type ShootingScheduleEntry,
  type VideoAnalytics,
  type MilestoneMap,
} from "@/lib/schema";
import { getPublishScheduleList } from "@/lib/computed/shooting-schedule";
import type { ShootingSchedulePatch } from "@/components/workspace/ShootingSchedulePane";
import { type YouTubeAnalyticsFetchResult } from "@/lib/youtube/fetch-analytics";
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { GlobalHeader } from "@/components/workspace/GlobalHeader";
import { PositionPane } from "@/components/workspace/PositionPane";
import { VideoPlanListPane } from "@/components/workspace/VideoPlanListPane";
import { VideoAnalyticsPane } from "@/components/workspace/VideoAnalyticsPane";
import { AnalyticsComparePane } from "@/components/workspace/AnalyticsComparePane";
import { SyncStatusBar } from "@/components/workspace/SyncStatusBar";
import { PaneResizeHandle } from "@/components/workspace/PaneResizeHandle";

type WorkspaceProps = {
  initialChannels: Channel[];
  initialVideoPlans: VideoPlan[];
  initialShootingSchedule: ShootingScheduleEntry[];
  workspace: { name: string; icon: string };
};

export function Workspace(props: WorkspaceProps) {
  const paneWidths = useWorkspacePaneWidths();

  return (
    <SidebarProvider
      defaultOpen
      className="relative h-screen w-full overflow-hidden bg-background text-foreground"
      style={
        {
          "--sidebar-width": `${paneWidths.widths.pane1}px`,
        } as CSSProperties
      }
    >
      <WorkspaceBody {...props} paneWidths={paneWidths} />
    </SidebarProvider>
  );
}

type WorkspaceBodyProps = WorkspaceProps & {
  paneWidths: ReturnType<typeof useWorkspacePaneWidths>;
};

function WorkspaceBody({
  initialChannels,
  initialVideoPlans,
  initialShootingSchedule,
  workspace,
  paneWidths,
}: WorkspaceBodyProps) {
  const { open: pane1Open } = useSidebar();
  const { widths, setPaneWidth, resizeAdjacent } = paneWidths;

  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [videoPlans, setVideoPlans] = useState<VideoPlan[]>(initialVideoPlans);
  const [shootingSchedule, setShootingSchedule] = useState<ShootingScheduleEntry[]>(
    initialShootingSchedule,
  );
  const [selectedShootingScheduleId, setSelectedShootingScheduleId] =
    useState<string | null>("sch-06-1");
  const [pane4Open, setPane4Open] = useState(false);
  const [milestoneSyncing, setMilestoneSyncing] = useState(false);

  const initialSnapshot = useMemo(
    () => ({
      channels: initialChannels,
      videoPlans: initialVideoPlans,
      shootingSchedule: initialShootingSchedule,
      workspace,
    }),
    [initialChannels, initialVideoPlans, initialShootingSchedule, workspace],
  );

  const {
    syncEnabled,
    syncStatus,
    remoteUpdatedAt,
    applyRemoteSnapshot,
    dismissRemoteUpdate,
  } = useWorkspaceSync({
    initialSnapshot,
    channels,
    videoPlans,
    shootingSchedule,
    workspaceMeta: workspace,
    setChannels,
    setVideoPlans,
    setShootingSchedule,
  });

  const selectShootingScheduleEntry = useCallback((id: string) => {
    setSelectedShootingScheduleId(id);
  }, []);

  const updateShootingScheduleEntry = useCallback(
    (id: string, patch: ShootingSchedulePatch) => {
      setShootingSchedule((prev) =>
        prev.map((e) => {
          if (e.id !== id) return e;
          const next = { ...e, ...patch };
          if (patch.url !== undefined && patch.url !== e.url) {
            next.analytics = { ...e.analytics, fetchedAt: "" };
          }
          return next;
        }),
      );
    },
    [],
  );

  const fetchYouTubeAnalyticsForSchedule = useCallback(
    async (
      url: string,
      publishDate?: string,
    ): Promise<YouTubeAnalyticsFetchResult> => {
      const res = await fetch("/api/youtube-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, publishDate: publishDate?.trim() || undefined }),
      });
      const data = (await res.json()) as YouTubeAnalyticsFetchResult & {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "分析データの取得に失敗しました");
      }
      return data;
    },
    [],
  );

  const updateScheduleAnalytics = useCallback(
    (patch: Partial<VideoAnalytics>) => {
      if (!selectedShootingScheduleId) return;
      setShootingSchedule((prev) =>
        prev.map((e) =>
          e.id === selectedShootingScheduleId
            ? { ...e, analytics: { ...e.analytics, ...patch } }
            : e,
        ),
      );
    },
    [selectedShootingScheduleId],
  );

  const syncMilestones = useCallback(async () => {
    const items = shootingSchedule
      .filter(isPublishedScheduleEntry)
      .map((e) => ({
        id: e.id,
        url: e.url.trim(),
        publishDate: e.publishDate.trim(),
      }));

    if (items.length === 0) {
      return {
        warnings: [] as string[],
        updatedWindowCount: 0,
        dueWindowCount: 0,
      };
    }

    const dueWindowCount = items.reduce(
      (sum, item) => sum + dueMilestoneWindows(item.publishDate).length,
      0,
    );

    setMilestoneSyncing(true);
    try {
      const res = await fetch("/api/youtube-analytics/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = (await res.json()) as {
        error?: string;
        results?: Array<{
          id: string;
          milestones: Partial<MilestoneMap>;
          warnings?: string[];
        }>;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "マイルストーン取得に失敗しました");
      }

      const results = data.results ?? [];
      const byId = new Map(
        results.map((r) => [r.id, r.milestones] as const),
      );

      let updatedWindowCount = 0;
      for (const patch of byId.values()) {
        for (const snapshot of Object.values(patch)) {
          if (!snapshot) continue;
          if (
            snapshot.views.trim() ||
            snapshot.impressions.trim() ||
            snapshot.ctrPercent.trim()
          ) {
            updatedWindowCount += 1;
          }
        }
      }

      setShootingSchedule((prev) =>
        prev.map((entry) => {
          const patch = byId.get(entry.id);
          if (!patch) return entry;
          return {
            ...entry,
            milestones: mergeMilestoneMaps(entry.milestones ?? {}, patch),
          };
        }),
      );

      return {
        warnings: results.flatMap((r) => r.warnings ?? []),
        updatedWindowCount,
        dueWindowCount,
      };
    } finally {
      setMilestoneSyncing(false);
    }
  }, [shootingSchedule]);

  const selectPublish = useCallback(
    (id: string) => selectShootingScheduleEntry(id),
    [selectShootingScheduleEntry],
  );

  const addChannel = useCallback((name: string) => {
    setChannels((prev) => [
      ...prev,
      { id: `d-${Date.now()}`, name, series: [] },
    ]);
  }, []);

  const deleteChannel = useCallback((deptId: string) => {
    setChannels((prev) => prev.filter((d) => d.id !== deptId));
  }, []);

  const togglePane4 = useCallback(() => setPane4Open((v) => !v), []);

  const publishItems = useMemo(
    () => getPublishScheduleList(shootingSchedule),
    [shootingSchedule],
  );

  const activeScheduleEntry = shootingSchedule.find(
    (e) => e.id === selectedShootingScheduleId,
  );
  const headerSelectionTitle =
    activeScheduleEntry?.videoTitle.trim() ||
    activeScheduleEntry?.freeNote.trim() ||
    "（未選択）";

  const pane4Width = pane4Open ? widths.pane4 : PANE4_COLLAPSED_WIDTH;

  const resizePane1 = useCallback(
    (delta: number) => setPaneWidth("pane1", widths.pane1 + delta),
    [setPaneWidth, widths.pane1],
  );

  const resizePanes = useCallback(
    (left: PaneWidthKey, right: PaneWidthKey, delta: number) => {
      resizeAdjacent(left, right, delta);
    },
    [resizeAdjacent],
  );

  return (
    <>
      <PositionPane
        workspaceName={workspace.name}
        publishItems={publishItems}
        selectedPublishId={selectedShootingScheduleId}
        onSelectPublish={selectPublish}
      />

      {pane1Open ? (
        <PaneResizeHandle
          className="absolute top-12 bottom-0 z-30 hidden md:block"
          style={{ left: widths.pane1 - 3 }}
          label="Pane 1 の幅を調整"
          onResize={resizePane1}
        />
      ) : null}

      <SidebarInset className="flex min-w-0 flex-col bg-background">
        <GlobalHeader
          workspaceName={workspace.name}
          selectionTitle={headerSelectionTitle}
          channels={channels}
          onAddChannel={addChannel}
          onDeleteChannel={deleteChannel}
        />
        <SyncStatusBar
          syncEnabled={syncEnabled}
          syncStatus={syncStatus}
          remoteUpdatedAt={remoteUpdatedAt}
          onApplyRemote={() => void applyRemoteSnapshot()}
          onDismissRemote={dismissRemoteUpdate}
        />
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <VideoPlanListPane
            shootingSchedule={shootingSchedule}
            selectedShootingScheduleId={selectedShootingScheduleId}
            onSelectShootingScheduleEntry={selectShootingScheduleEntry}
            onUpdateShootingScheduleEntry={updateShootingScheduleEntry}
            width={widths.pane2}
          />
          <PaneResizeHandle
            label="Pane 2 と 3 の幅を調整"
            onResize={(delta) => resizePanes("pane2", "pane3", delta)}
          />
          <VideoAnalyticsPane
            entry={activeScheduleEntry ?? null}
            onUpdateAnalytics={updateScheduleAnalytics}
            fetchAnalytics={fetchYouTubeAnalyticsForSchedule}
            width={widths.pane3}
          />
          <PaneResizeHandle
            label="Pane 3 と 4 の幅を調整"
            disabled={!pane4Open}
            onResize={(delta) => resizePanes("pane3", "pane4", delta)}
          />
          <AnalyticsComparePane
            entries={shootingSchedule}
            selectedEntryId={selectedShootingScheduleId}
            pane4Open={pane4Open}
            width={pane4Width}
            onTogglePane4={togglePane4}
            onSelectEntry={selectShootingScheduleEntry}
            onSyncMilestones={syncMilestones}
            milestoneSyncing={milestoneSyncing}
          />
        </div>
      </SidebarInset>
    </>
  );
}
