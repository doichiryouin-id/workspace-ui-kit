import { describe, expect, it } from "vitest";

import shootingScheduleData from "@/data/shooting-schedule.json";
import positionsData from "@/data/positions.json";
import videoPlansData from "@/data/video-plans.json";
import workspaceData from "@/data/workspace.json";
import { workspaceSnapshotFingerprint } from "@/lib/workspace-sync/fingerprint";
import {
  type WorkspaceSnapshot,
  workspaceSnapshotSchema,
} from "@/lib/workspace-sync/types";

describe("workspaceSnapshotFingerprint", () => {
  const snapshot: WorkspaceSnapshot = {
    channels: positionsData,
    videoPlans: videoPlansData,
    shootingSchedule: shootingScheduleData,
    workspace: workspaceData,
  };

  it("同じスナップショットは同じ指紋になる", () => {
    const a = workspaceSnapshotFingerprint(snapshot);
    const b = workspaceSnapshotFingerprint(snapshot);
    expect(a).toBe(b);
  });

  it("parse を2回通しても指紋は同じ", () => {
    const once = workspaceSnapshotFingerprint(snapshot);
    const twice = workspaceSnapshotFingerprint(
      workspaceSnapshotSchema.parse(JSON.parse(once)),
    );
    expect(once).toBe(twice);
  });
});
