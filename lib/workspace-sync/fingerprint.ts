import {
  type WorkspaceSnapshot,
  workspaceSnapshotSchema,
} from "@/lib/workspace-sync/types";

/** クラウド保存の要否判定用。zod 正規化後の JSON で比較する。 */
export function workspaceSnapshotFingerprint(
  snapshot: WorkspaceSnapshot,
): string {
  return JSON.stringify(workspaceSnapshotSchema.parse(snapshot));
}
