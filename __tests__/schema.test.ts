import { describe, it, expect } from "vitest";

import {
  candidatesSchema,
  departmentsSchema,
  workspaceSchema,
} from "@/lib/schema";

import positionsData from "@/data/positions.json";
import candidatesData from "@/data/candidates.json";
import workspaceData from "@/data/workspace.json";

describe("data/*.json schema validation", () => {
  it("data/positions.json は departmentsSchema を満たす", () => {
    const result = departmentsSchema.safeParse(positionsData);
    expect(result.success).toBe(true);
  });

  it("data/candidates.json は candidatesSchema を満たす", () => {
    const result = candidatesSchema.safeParse(candidatesData);
    expect(result.success).toBe(true);
  });

  it("data/workspace.json は workspaceSchema を満たす", () => {
    const result = workspaceSchema.safeParse(workspaceData);
    expect(result.success).toBe(true);
  });
});

describe("schema rejects invalid data", () => {
  it("departmentsSchema は配列を期待する", () => {
    expect(departmentsSchema.safeParse({}).success).toBe(false);
    expect(departmentsSchema.safeParse(null).success).toBe(false);
  });

  it("candidate は stage が StageKey でないと不可", () => {
    expect(
      candidatesSchema.safeParse([
        {
          id: "x",
          profile: {
            name: "x",
            birthday: "",
            source: "",
            email: "",
            phone: "",
            address: "",
            recruiter: "",
            desiredSalaryMin: "",
            desiredSalaryMax: "",
            availableStartDate: "",
            careerText: "",
            motivationFull: "",
          },
          scorecards: [],
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
