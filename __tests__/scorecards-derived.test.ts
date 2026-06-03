import { describe, it, expect } from "vitest";

import { type VideoPlan, type Subtask } from "@/lib/schema";
import {
  calculateAverageScore,
  getVideoPlanAverageScore,
  getCommentedSubtasks,
  getLatestDoneSubtask,
  getSubtasksAverageScore,
} from "@/lib/computed/subtasks";

const baseSubtask = (over: Partial<Subtask>): Subtask => ({
  id: "st-test",
  label: "構成メモ",
  date: "",
  format: "",
  assignee: "",
  axisScores: {
    achievements: null,
    thinkingAbility: null,
    communication: null,
    cultureFit: null,
  },
  attachments: [],
  ...over,
});

describe("calculateAverageScore", () => {
  it("全フィールドが null なら null", () => {
    expect(
      calculateAverageScore({
        achievements: null,
        thinkingAbility: null,
        communication: null,
        cultureFit: null,
      }),
    ).toBeNull();
  });

  it("一部 null は除外して平均", () => {
    expect(
      calculateAverageScore({
        achievements: 4,
        thinkingAbility: 3,
        communication: null,
        cultureFit: null,
      }),
    ).toBe(3.5);
  });

  it("4 軸全部入っていれば単純平均", () => {
    expect(
      calculateAverageScore({
        achievements: 5,
        thinkingAbility: 4,
        communication: 3,
        cultureFit: 4,
      }),
    ).toBe(4);
  });
});

describe("getLatestDoneSubtask", () => {
  it("done が無ければ undefined", () => {
    const cards = [
      baseSubtask({ id: "a", date: "2026-04-01" }),
      baseSubtask({ id: "b" }),
    ];
    expect(getLatestDoneSubtask(cards)).toBeUndefined();
  });

  it("配列末尾に近い done を返す", () => {
    const cards = [
      baseSubtask({
        id: "a",
        date: "2026-04-01",
        decision: "完了",
      }),
      baseSubtask({
        id: "b",
        date: "2026-04-10",
        decision: "完了",
      }),
      baseSubtask({ id: "c", date: "2026-04-20" }),
    ];
    const latest = getLatestDoneSubtask(cards);
    expect(latest?.id).toBe("b");
  });
});

describe("getVideoPlanAverageScore / getSubtasksAverageScore", () => {
  it("done subtask が無ければ null", () => {
    const plan: VideoPlan = {
      id: "v1",
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
      stage: "idea",
      archived: false,
    };
    expect(getVideoPlanAverageScore(plan)).toBeNull();
    expect(getSubtasksAverageScore([])).toBeNull();
  });

  it("最新 done の axisScores を平均する", () => {
    const cards = [
      baseSubtask({
        id: "a",
        decision: "完了",
        axisScores: {
          achievements: 5,
          thinkingAbility: 5,
          communication: 5,
          cultureFit: 5,
        },
      }),
      baseSubtask({
        id: "b",
        decision: "完了",
        axisScores: {
          achievements: 3,
          thinkingAbility: 3,
          communication: 3,
          cultureFit: 3,
        },
      }),
    ];
    expect(getSubtasksAverageScore(cards)).toBe(3);
  });
});

describe("getCommentedSubtasks", () => {
  it("done かつ comment 付きのみ返す", () => {
    const cards = [
      baseSubtask({
        id: "b",
        decision: "完了",
        comment: "台本OK",
      }),
      baseSubtask({
        id: "a",
        decision: "完了",
        comment: "フック案あり",
      }),
      baseSubtask({
        id: "c",
        date: "2026-05-01",
        comment: "未確定だが期待",
      }),
    ];
    const result = getCommentedSubtasks(cards);
    expect(result.map((c) => c.id)).toEqual(["b", "a"]);
  });
});
