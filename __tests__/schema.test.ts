import { describe, it, expect } from "vitest";

import {
  videoPlansSchema,
  channelsSchema,
  shootingScheduleSchema,
  workspaceSchema,
} from "@/lib/schema";

import positionsData from "@/data/positions.json";
import shootingScheduleData from "@/data/shooting-schedule.json";
import videoPlansData from "@/data/video-plans.json";
import workspaceData from "@/data/workspace.json";

describe("data/*.json schema validation", () => {
  it("data/positions.json は channelsSchema を満たす", () => {
    const result = channelsSchema.safeParse(positionsData);
    expect(result.success).toBe(true);
  });

  it("data/video-plans.json は videoPlansSchema を満たす", () => {
    const result = videoPlansSchema.safeParse(videoPlansData);
    expect(result.success).toBe(true);
  });

  it("data/workspace.json は workspaceSchema を満たす", () => {
    const result = workspaceSchema.safeParse(workspaceData);
    expect(result.success).toBe(true);
  });

  it("data/shooting-schedule.json は shootingScheduleSchema を満たす", () => {
    const result = shootingScheduleSchema.safeParse(shootingScheduleData);
    expect(result.success).toBe(true);
  });
});

describe("schema rejects invalid data", () => {
  it("channelsSchema は配列を期待する", () => {
    expect(channelsSchema.safeParse({}).success).toBe(false);
    expect(channelsSchema.safeParse(null).success).toBe(false);
  });

  it("videoPlan は stage が StageKey でないと不可", () => {
    expect(
      videoPlansSchema.safeParse([
        {
          id: "x",
          profile: {
            name: "x",
            source: "",
            assignee: "",
            priority: "",
            availableStartDate: "",
            productionProgressNote: "",
            outline: "",
            descriptionNotes: "",
          },
          subtasks: [],
          stage: "unknown-stage",
        },
      ]).success,
    ).toBe(false);
  });

  it("workspaceSchema は name と icon を要求する", () => {
    expect(workspaceSchema.safeParse({ name: "" }).success).toBe(false);
    expect(workspaceSchema.safeParse({ icon: "" }).success).toBe(false);
  });
});

describe("videoPlan.archived の取り扱い", () => {
  const baseVideoPlan = {
    id: "v-archived-test",
    profile: {
      name: "テスト動画",
      referenceUrl: "",
      source: "",
      assignee: "",
      priority: "",
      availableStartDate: "",
      productionProgressNote: "",
      outline: "",
      descriptionNotes: "",
    },
    subtasks: [],
    stage: "idea" as const,
  };

  it("archived 未指定なら false がデフォルトで埋まる", () => {
    const result = videoPlansSchema.safeParse([baseVideoPlan]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].archived).toBe(false);
    }
  });

  it("archived: true を許容する", () => {
    const result = videoPlansSchema.safeParse([
      { ...baseVideoPlan, archived: true },
    ]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].archived).toBe(true);
    }
  });

  it("archived が boolean でなければ不可", () => {
    const result = videoPlansSchema.safeParse([
      { ...baseVideoPlan, archived: "yes" },
    ]);
    expect(result.success).toBe(false);
  });
});
