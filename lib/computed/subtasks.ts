/**
 * Subtask / VideoPlan の派生計算（制作チェック評価系）SSoT。
 */

import {
  type VideoPlan,
  type AxisScores,
  type Subtask,
  type StageStatus,
  AXIS_ORDER,
} from "@/lib/schema";

export function getLatestDoneSubtask(
  subtasks: Subtask[],
): Subtask | undefined {
  return [...subtasks]
    .reverse()
    .find((s) => deriveSubtaskStatus(s.date, s.decision) === "done");
}

export function calculateAverageScore(axisScores: AxisScores): number | null {
  const values = AXIS_ORDER.map((k) => axisScores[k]).filter(
    (v): v is number => v !== null,
  );
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function getVideoPlanAverageScore(plan: VideoPlan): number | null {
  const latest = getLatestDoneSubtask(plan.subtasks);
  if (!latest) return null;
  return calculateAverageScore(latest.axisScores);
}

export function getCommentedSubtasks(subtasks: Subtask[]): Subtask[] {
  return subtasks.filter(
    (s) => deriveSubtaskStatus(s.date, s.decision) === "done" && s.comment,
  );
}

export function getSubtasksAverageScore(subtasks: Subtask[]): number | null {
  const latest = getLatestDoneSubtask(subtasks);
  if (!latest) return null;
  return calculateAverageScore(latest.axisScores);
}

export function deriveSubtaskStatus(
  date: string,
  decision?: string,
): StageStatus {
  if (decision && decision.trim() !== "") return "done";
  if (date && date.trim() !== "") return "planned";
  return "pending";
}

/** @deprecated 互換の別名（deriveSubtaskStatus と同義） */
export const deriveStageStatus = deriveSubtaskStatus;
