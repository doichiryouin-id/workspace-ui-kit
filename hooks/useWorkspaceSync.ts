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
const REMOTE_POLL_MS = 5_000;

type RemotePayload =
  | { enabled: false }
  | {
      enabled: true;
      empty: boolean;
      updatedAt: string | null;
      data?: WorkspaceSnapshot;
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
  const dismissedRemoteUpdatedAt = useRef<string | null>(null);
  const initialLoadComplete = useRef(false);
  const skipSaveTokens = useRef(0);
  const saveEpoch = useRef(0);
  const saving = useRef(false);
  const lastPersistedFingerprint = useRef<string | null>(null);
  const savedMessageTimer = useRef<number | null>(null);
  const syncStatusRef = useRef<SyncStatus>("loading");
  syncStatusRef.current = syncStatus;

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
      // 進行中の保存応答・直後の自動保存を無効化（反映直後の上書き防止）
      saveEpoch.current += 1;
      skipSaveTokens.current += 2;
      saving.current = false;
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

  const loadRemote = useCallback(async (): Promise<RemotePayload> => {
    const res = await fetch("/api/workspace", { cache: "no-store" });
    if (!res.ok) throw new Error("クラウドデータの読み込みに失敗しました");
    return (await res.json()) as RemotePayload;
  }, []);

  const normalizeRemoteData = useCallback((data: WorkspaceSnapshot) => {
    return workspaceSnapshotSchema.parse(data);
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
          const normalized = workspaceSnapshotSchema.parse(payload.data);
          applySnapshotRef.current(normalized);
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

    // 相手更新の確認中は自分の自動保存を止める（反映前に巻き戻すのを防ぐ）
    if (
      syncStatusRef.current === "remote-update" ||
      syncStatusRef.current === "conflict"
    ) {
      return;
    }

    if (skipSaveTokens.current > 0) {
      skipSaveTokens.current -= 1;
      return;
    }

    const fingerprint = workspaceSnapshotFingerprint(buildSnapshot());
    if (fingerprint === lastPersistedFingerprint.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        if (saving.current) return;
        if (
          syncStatusRef.current === "remote-update" ||
          syncStatusRef.current === "conflict"
        ) {
          return;
        }

        const currentFingerprint = workspaceSnapshotFingerprint(buildSnapshot());
        if (currentFingerprint === lastPersistedFingerprint.current) {
          return;
        }

        const epoch = saveEpoch.current;
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

          // 反映ボタンや新しい編集で無効化された古い保存は捨てる
          if (epoch !== saveEpoch.current) {
            return;
          }

          if (res.status === 409 || json.conflict) {
            setSyncStatus("conflict");
            const latest = await loadRemote();
            if (latest.enabled && !latest.empty && latest.data) {
              setPendingRemote(normalizeRemoteData(latest.data));
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
          if (epoch === saveEpoch.current) {
            setSyncStatus("error");
          }
        } finally {
          if (epoch === saveEpoch.current) {
            saving.current = false;
          }
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
    normalizeRemoteData,
    shootingSchedule,
    showSavedBriefly,
    syncEnabled,
    syncStatus,
    videoPlans,
  ]);

  const ingestRemoteIfNewer = useCallback(
    async (options?: { forcePrompt?: boolean }) => {
      if (saving.current) return;
      try {
        const payload = await loadRemote();
        if (!payload.enabled || payload.empty || !payload.data || !payload.updatedAt) {
          return;
        }

        const remoteMs = new Date(payload.updatedAt).getTime();
        const knownMs = knownRemoteUpdatedAt.current
          ? new Date(knownRemoteUpdatedAt.current).getTime()
          : 0;
        if (remoteMs <= knownMs) return;

        const remoteData = normalizeRemoteData(payload.data);
        const remoteFingerprint = workspaceSnapshotFingerprint(remoteData);
        const localFingerprint = workspaceSnapshotFingerprint(buildSnapshot());

        // 中身が同じなら時刻だけ追従
        if (remoteFingerprint === localFingerprint) {
          knownRemoteUpdatedAt.current = payload.updatedAt;
          setRemoteUpdatedAt(payload.updatedAt);
          markPersisted(remoteData);
          dismissedRemoteUpdatedAt.current = null;
          return;
        }

        const localClean =
          localFingerprint === lastPersistedFingerprint.current;

        // 自分の未保存編集がなければ自動で取り込む
        if (localClean && !options?.forcePrompt) {
          applySnapshot(remoteData);
          knownRemoteUpdatedAt.current = payload.updatedAt;
          setRemoteUpdatedAt(payload.updatedAt);
          setPendingRemote(null);
          dismissedRemoteUpdatedAt.current = null;
          setSyncStatus("ready");
          return;
        }

        if (
          !options?.forcePrompt &&
          dismissedRemoteUpdatedAt.current === payload.updatedAt
        ) {
          return;
        }

        setPendingRemote(remoteData);
        setRemoteUpdatedAt(payload.updatedAt);
        setSyncStatus("remote-update");
      } catch {
        // ポーリング失敗は黙ってスキップ
      }
    },
    [applySnapshot, buildSnapshot, loadRemote, markPersisted, normalizeRemoteData],
  );

  useEffect(() => {
    if (!syncEnabled || !initialLoadComplete.current) return;

    const tick = () => {
      void ingestRemoteIfNewer();
    };

    const poll = window.setInterval(tick, REMOTE_POLL_MS);
    const onFocus = () => tick();
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ingestRemoteIfNewer, syncEnabled]);

  const applyRemoteSnapshot = useCallback(async () => {
    // 必ずクラウドから取り直す（古い pending のまま画面が変わらない・巻き戻るのを防ぐ）
    try {
      setSyncStatus("loading");
      const payload = await loadRemote();
      if (!payload.enabled || payload.empty || !payload.data) {
        if (pendingRemote) {
          applySnapshot(pendingRemote);
          if (remoteUpdatedAt) {
            knownRemoteUpdatedAt.current = remoteUpdatedAt;
          }
          setPendingRemote(null);
          dismissedRemoteUpdatedAt.current = null;
          setSyncStatus("ready");
          return;
        }
        setSyncStatus("error");
        return;
      }

      const remoteData = normalizeRemoteData(payload.data);
      applySnapshot(remoteData);
      knownRemoteUpdatedAt.current = payload.updatedAt;
      setRemoteUpdatedAt(payload.updatedAt);
      setPendingRemote(null);
      dismissedRemoteUpdatedAt.current = null;
      setSyncStatus("ready");
    } catch {
      setSyncStatus("error");
    }
  }, [
    applySnapshot,
    loadRemote,
    normalizeRemoteData,
    pendingRemote,
    remoteUpdatedAt,
  ]);

  const dismissRemoteUpdate = useCallback(() => {
    // knownRemoteUpdatedAt は進めない → 保存時に 409 競合で相手の更新を検知できる
    if (remoteUpdatedAt) {
      dismissedRemoteUpdatedAt.current = remoteUpdatedAt;
    }
    setPendingRemote(null);
    setSyncStatus("ready");
  }, [remoteUpdatedAt]);

  return {
    syncEnabled,
    syncStatus,
    remoteUpdatedAt,
    applyRemoteSnapshot,
    dismissRemoteUpdate,
  };
}
