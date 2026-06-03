import { type VideoPlanProfile, type Subtask } from "@/lib/schema";

export function createMinimalSubtask(label = "新しいサブタスク"): Subtask {
  return {
    id: `st-${Date.now()}`,
    label,
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
  };
}

export function createMinimalVideoPlanProfile(name: string): VideoPlanProfile {
  return {
    name,
    referenceUrl: "",
    source: "",
    assignee: "",
    priority: "",
    availableStartDate: "",
    productionProgressNote: "",
    outline: "",
    descriptionNotes: "",
  };
}
