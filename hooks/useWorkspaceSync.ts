"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  type Channel,
  type ShootingScheduleEntry,
  type VideoPlan,
} from "@/lib/schema";
import {
  type WorkspaceSnapshot,
  workspaceSnapshotSchema,
} from "@/lib/workspace-sync/types";

export type SyncStatus =
  | "local"
  | "loading"
  | "ready"
  | "saving"
  | "saved"
  | "error"
  | "remote-update"
  | "conflict";

type UseWorkspaceSyncArgs = {
  initialSnapshot: WorkspaceSnapshot;
  channels: Channel[];
  videoPlans: VideoPlan[];
  shootingSchedule: ShootingScheduleEntry[];
  workspaceMeta: WorkspaceSnapshot["workspace"];
  setChannels: React.Dispatch<React.SetStateAction<Channel[]>>;
  setVideoPlans: React.Dispatch<React.SetStateAction<VideoPlan[]>>;
  setShootingSchedule: React.Dispatch<
    React.SetStateAction<ShootingScheduleEntry[]>
  >;
};

type UseWorkspaceSyncResult = {
  syncEnabled: boolean;
  syncStatus: SyncStatus;
  remoteUpdatedAt: string | null;
  applyRemoteSnapshot: () => Promise<void>;
  dismissRemoteUpdate: () => void;
};

export function useWorkspaceSync({
  initialSnapshot,
  channels,
  videoPlans,
  shootingSchedule,
  workspaceMeta,
  setChannels,
  setVideoPlans,
  setShootingSchedule,
}: UseWorkspaceSyncArgs): UseWorkspaceSyncResult {
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");
  const [remoteUpdatedAt, setRemoteUpdatedAt] = useState<string | null>(null);
  const [pendingRemote, setPendingRemote] = useState<WorkspaceSnapshot | null>(
    null,
  );

  const knownRemoteUpdatedAt = useRef<string | null>(null);
  const hydratedFromCloud = useRef(false);
  const skipNextSave = useRef(false);
  const saving = useRef(false);

  const buildSnapshot = useCallback((): WorkspaceSnapshot => {
    return workspaceSnapshotSchema.parse({
      channels,
      videoPlans,
      shootingSchedule,
      workspace: workspaceMeta,
    });
  }, [channels, videoPlans, shootingSchedule, workspaceMeta]);

  const applySnapshot = useCallback(
    (snapshot: WorkspaceSnapshot) => {
      skipNextSave.current = true;
      setChannels(snapshot.channels);
      setVideoPlans(snapshot.videoPlans);
      setShootingSchedule(snapshot.shootingSchedule);
    },
    [setChannels, setVideoPlans, setShootingSchedule],
  );

  const loadRemote = useCallback(async () => {
    const res = await fetch("/api/workspace", { cache: "no-store" });
    if (!res.ok) throw new Error("クラウドデータの読み込みに失敗しました");
    return (await res.json()) as
      | { enabled: false }
      | {
          enabled: true;
          empty: boolean;
          updatedAt: string | null;
          data?: WorkspaceSnapshot;
        };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const payload = await loadRemote();
        if (cancelled) return;

        if (!payload.enabled) {
          setSyncEnabled(false);
          setSyncStatus("local");
          return;
        }

        setSyncEnabled(true);
        if (!payload.empty && payload.data) {
          applySnapshot(payload.data);
          knownRemoteUpdatedAt.current = payload.updatedAt;
          setRemoteUpdatedAt(payload.updatedAt);
          hydratedFromCloud.current = true;
        } else {
          knownRemoteUpdatedAt.current = payload.updatedAt;
          setRemoteUpdatedAt(payload.updatedAt);
          // 初回: ローカル JSON をクラウドへ種まき
          const seed = workspaceSnapshotSchema.parse(initialSnapshot);
          const putRes = await fetch("/api/workspace", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              data: seed,
              expectedUpdatedAt: payload.updatedAt,
            }),
          });
          const putJson = (await putRes.json()) as {
            ok?: boolean;
            updatedAt?: string;
          };
          if (putRes.ok && putJson.updatedAt) {
            knownRemoteUpdatedAt.current = putJson.updatedAt;
            setRemoteUpdatedAt(putJson.updatedAt);
          }
        }
        setSyncStatus("ready");
      } catch {
        if (!cancelled) {
          setSyncEnabled(false);
          setSyncStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applySnapshot, initialSnapshot, loadRemote]);

  useEffect(() => {
    if (!syncEnabled || syncStatus === "loading") return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        if (saving.current) return;
        saving.current = true;
        setSyncStatus("saving");
        try {
          const res = await fetch("/api/workspace", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              data: buildSnapshot(),
              expectedUpdatedAt: knownRemoteUpdatedAt.current,
            }),
          });
          const json = (await res.json()) as {
            ok?: boolean;
            updatedAt?: string;
            conflict?: boolean;
            error?: string;
          };

          if (res.status === 409 || json.conflict) {
            setSyncStatus("conflict");
            const latest = await loadRemote();
            if (latest.enabled && !latest.empty && latest.data) {
              setPendingRemote(latest.data);
              if (latest.updatedAt) {
                setRemoteUpdatedAt(latest.updatedAt);
              }
            }
            return;
          }

          if (!res.ok || !json.ok || !json.updatedAt) {
            throw new Error(json.error ?? "保存に失敗しました");
          }

          knownRemoteUpdatedAt.current = json.updatedAt;
          setRemoteUpdatedAt(json.updatedAt);
          setSyncStatus("saved");
          window.setTimeout(() => {
            setSyncStatus((current) =>
              current === "saved" ? "ready" : current,
            );
          }, 1500);
        } catch {
          setSyncStatus("error");
        } finally {
          saving.current = false;
        }
      })();
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [
    buildSnapshot,
    channels,
    loadRemote,
    shootingSchedule,
    syncEnabled,
    syncStatus,
    videoPlans,
  ]);

  useEffect(() => {
    if (!syncEnabled) return;

    const poll = window.setInterval(() => {
      void (async () => {
        if (saving.current || syncStatus === "conflict") return;
        try {
          const payload = await loadRemote();
          if (!payload.enabled || payload.empty || !payload.data) return;
          if (
            payload.updatedAt &&
            knownRemoteUpdatedAt.current &&
            new Date(payload.updatedAt).getTime() >
              new Date(knownRemoteUpdatedAt.current).getTime()
          ) {
            setPendingRemote(payload.data);
            setRemoteUpdatedAt(payload.updatedAt);
            setSyncStatus("remote-update");
          }
        } catch {
          // ポーリング失敗は黙ってスキップ
        }
      })();
    }, 12_000);

    return () => window.clearInterval(poll);
  }, [loadRemote, syncEnabled, syncStatus]);

  const applyRemoteSnapshot = useCallback(async () => {
    if (pendingRemote) {
      applySnapshot(pendingRemote);
      setPendingRemote(null);
      if (remoteUpdatedAt) {
        knownRemoteUpdatedAt.current = remoteUpdatedAt;
      }
      setSyncStatus("ready");
      return;
    }
    const payload = await loadRemote();
    if (payload.enabled && !payload.empty && payload.data) {
      applySnapshot(payload.data);
      knownRemoteUpdatedAt.current = payload.updatedAt;
      setRemoteUpdatedAt(payload.updatedAt);
      setPendingRemote(null);
      setSyncStatus("ready");
    }
  }, [applySnapshot, loadRemote, pendingRemote, remoteUpdatedAt]);

  const dismissRemoteUpdate = useCallback(() => {
    setPendingRemote(null);
    setSyncStatus("ready");
  }, []);

  return {
    syncEnabled,
    syncStatus,
    remoteUpdatedAt,
    applyRemoteSnapshot,
    dismissRemoteUpdate,
  };
}
