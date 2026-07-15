"use client";

import { Cloud, CloudOff, Loader2, RefreshCw } from "lucide-react";

import { type SyncStatus } from "@/hooks/useWorkspaceSync";
import { SYNC_UI } from "@/lib/labels";
import { Button } from "@/components/ui/button";

type SyncStatusBarProps = {
  syncEnabled: boolean;
  syncStatus: SyncStatus;
  remoteUpdatedAt: string | null;
  onApplyRemote: () => void;
  onDismissRemote: () => void;
};

export function SyncStatusBar({
  syncEnabled,
  syncStatus,
  remoteUpdatedAt,
  onApplyRemote,
  onDismissRemote,
}: SyncStatusBarProps) {
  if (!syncEnabled && syncStatus === "local") {
    return (
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
        <CloudOff className="size-3.5 shrink-0" aria-hidden="true" />
        {SYNC_UI.localMode}
      </div>
    );
  }

  if (syncStatus === "loading") {
    return (
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden="true" />
        {SYNC_UI.loading}
      </div>
    );
  }

  if (syncStatus === "remote-update" || syncStatus === "conflict") {
    return (
      <div className="flex flex-wrap items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-foreground">
        <RefreshCw className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="flex-1">{SYNC_UI.remoteUpdate}</span>
        <Button type="button" size="sm" variant="secondary" onClick={onApplyRemote}>
          {SYNC_UI.applyRemote}
        </Button>
        {syncStatus === "remote-update" ? (
          <Button type="button" size="sm" variant="ghost" onClick={onDismissRemote}>
            {SYNC_UI.keepMine}
          </Button>
        ) : null}
      </div>
    );
  }

  let message: string = SYNC_UI.ready;
  if (syncStatus === "saving") message = SYNC_UI.saving;
  if (syncStatus === "saved") message = SYNC_UI.saved;
  if (syncStatus === "error") message = SYNC_UI.error;

  return (
    <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground">
      <Cloud className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
      <span className="ml-auto flex items-center gap-2">
        {syncEnabled ? (
          <Button type="button" size="sm" variant="ghost" onClick={onApplyRemote}>
            <RefreshCw className="size-3.5" aria-hidden="true" />
            {SYNC_UI.refreshNow}
          </Button>
        ) : null}
        {remoteUpdatedAt ? (
          <span className="tabular-nums">{SYNC_UI.lastSynced(remoteUpdatedAt)}</span>
        ) : null}
      </span>
    </div>
  );
}
