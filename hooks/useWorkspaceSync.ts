"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  type Channel,
  type ShootingScheduleEntry,
  type VideoPlan,
} from "@/lib/schema";
import { workspaceSnapshotFingerprint } from "@/lib/workspace-sync/fingerprint";
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

const SAVE_DEBOUNCE_MS = 1500;
const SAVED_MESSAGE_MS = 1500;
const REMOTE_POLL_MS = 12_000;

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
  const initialLoadComplete = useRef(false);
  const skipNextSave = useRef(false);
  const saving = useRef(false);
  const lastPersistedFingerprint = useRef<string | null>(null);
  const savedMessageTimer = useRef<number | null>(null);

  const buildSnapshot = useCallback((): WorkspaceSnapshot => {
    return workspaceSnapshotSchema.parse({
      channels,
      videoPlans,
      shootingSchedule,
      workspace: workspaceMeta,
    });
  }, [channels, videoPlans, shootingSchedule, workspaceMeta]);

  const markPersisted = useCallback(
    (snapshot?: WorkspaceSnapshot) => {
      lastPersistedFingerprint.current = workspaceSnapshotFingerprint(
        snapshot ?? buildSnapshot(),
      );
    },
    [buildSnapshot],
  );

  const applySnapshot = useCallback(
    (snapshot: WorkspaceSnapshot) => {
      skipNextSave.current = true;
      setChannels(snapshot.channels);
      setVideoPlans(snapshot.videoPlans);
      setShootingSchedule(snapshot.shootingSchedule);
      markPersisted(snapshot);
    },
    [markPersisted, setChannels, setVideoPlans, setShootingSchedule],
  );

  const clearSavedMessageTimer = useCallback(() => {
    if (savedMessageTimer.current !== null) {
      window.clearTimeout(savedMessageTimer.current);
      savedMessageTimer.current = null;
    }
  }, []);

  const showSavedBriefly = useCallback(() => {
    clearSavedMessageTimer();
    setSyncStatus("saved");
    savedMessageTimer.current = window.setTimeout(() => {
      setSyncStatus((current) => (current === "saved" ? "ready" : current));
      savedMessageTimer.current = null;
    }, SAVED_MESSAGE_MS);
  }, [clearSavedMessageTimer]);

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

  const applySnapshotRef = useRef(applySnapshot);
  applySnapshotRef.current = applySnapshot;
  const markPersistedRef = useRef(markPersisted);
  markPersistedRef.current = markPersisted;

  useEffect(() => {
    // 初回ハイドレーションのみ。編集で applySnapshot が変わってもクラウドを再読込しない
    if (initialLoadComplete.current) return;

    let cancelled = false;

    void (async () => {
      try {
        const payload = await loadRemote();
        if (cancelled || initialLoadComplete.current) return;

        if (!payload.enabled) {
          setSyncEnabled(false);
          setSyncStatus("local");
          initialLoadComplete.current = true;
          markPersistedRef.current();
          return;
        }

        setSyncEnabled(true);
        if (!payload.empty && payload.data) {
          applySnapshotRef.current(payload.data);
          knownRemoteUpdatedAt.current = payload.updatedAt;
          setRemoteUpdatedAt(payload.updatedAt);
        } else {
          knownRemoteUpdatedAt.current = payload.updatedAt;
          setRemoteUpdatedAt(payload.updatedAt);
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
          markPersistedRef.current(seed);
        }
        setSyncStatus("ready");
        initialLoadComplete.current = true;
      } catch {
        if (!cancelled && !initialLoadComplete.current) {
          setSyncEnabled(false);
          setSyncStatus("error");
          initialLoadComplete.current = true;
        }
      }
    })();

    return () => {
      cancelled = true;
      clearSavedMessageTimer();
    };
  }, [clearSavedMessageTimer, initialSnapshot, loadRemote]);

  useEffect(() => {
    if (!syncEnabled || !initialLoadComplete.current) return;

    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    const fingerprint = workspaceSnapshotFingerprint(buildSnapshot());
    if (fingerprint === lastPersistedFingerprint.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        if (saving.current) return;

        const currentFingerprint = workspaceSnapshotFingerprint(buildSnapshot());
        if (currentFingerprint === lastPersistedFingerprint.current) {
          return;
        }

        saving.current = true;
        clearSavedMessageTimer();
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
          markPersisted();
          showSavedBriefly();
        } catch {
          setSyncStatus("error");
        } finally {
          saving.current = false;
        }
      })();
    }, SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [
    buildSnapshot,
    channels,
    clearSavedMessageTimer,
    loadRemote,
    markPersisted,
    shootingSchedule,
    showSavedBriefly,
    syncEnabled,
    videoPlans,
  ]);

  useEffect(() => {
    if (!syncEnabled || !initialLoadComplete.current) return;

    const poll = window.setInterval(() => {
      void (async () => {
        if (saving.current) return;
        try {
          const payload = await loadRemote();
          if (!payload.enabled || payload.empty || !payload.data) return;
          if (
            !payload.updatedAt ||
            !knownRemoteUpdatedAt.current ||
            new Date(payload.updatedAt).getTime() <=
              new Date(knownRemoteUpdatedAt.current).getTime()
          ) {
            return;
          }

          const remoteFingerprint = workspaceSnapshotFingerprint(payload.data);
          const localFingerprint = workspaceSnapshotFingerprint(buildSnapshot());
          if (remoteFingerprint === localFingerprint) {
            knownRemoteUpdatedAt.current = payload.updatedAt;
            setRemoteUpdatedAt(payload.updatedAt);
            markPersisted(payload.data);
            return;
          }

          setPendingRemote(payload.data);
          setRemoteUpdatedAt(payload.updatedAt);
          setSyncStatus("remote-update");
        } catch {
          // ポーリング失敗は黙ってスキップ
        }
      })();
    }, REMOTE_POLL_MS);

    return () => window.clearInterval(poll);
  }, [buildSnapshot, loadRemote, markPersisted, syncEnabled]);

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
    if (remoteUpdatedAt) {
      knownRemoteUpdatedAt.current = remoteUpdatedAt;
    }
    markPersisted();
    setSyncStatus("ready");
  }, [markPersisted, remoteUpdatedAt]);

  return {
    syncEnabled,
    syncStatus,
    remoteUpdatedAt,
    applyRemoteSnapshot,
    dismissRemoteUpdate,
  };
}
