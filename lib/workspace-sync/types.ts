import { z } from "zod";

import {
  channelsSchema,
  shootingScheduleSchema,
  videoPlansSchema,
  workspaceSchema,
} from "@/lib/schema";

/** 2名共有用にクラウドへ保存するワークスペース全体。 */
export const workspaceSnapshotSchema = z.object({
  channels: channelsSchema,
  videoPlans: videoPlansSchema,
  shootingSchedule: shootingScheduleSchema,
  workspace: workspaceSchema,
});
export type WorkspaceSnapshot = z.infer<typeof workspaceSnapshotSchema>;

export type WorkspaceSyncMeta = {
  enabled: boolean;
  updatedAt: string | null;
};

export type WorkspaceGetResponse =
  | { enabled: false }
  | {
      enabled: true;
      updatedAt: string;
      data: WorkspaceSnapshot;
    };

export type WorkspacePutResponse =
  | { ok: true; updatedAt: string }
  | { ok: false; error: string; conflict?: boolean; updatedAt?: string };
