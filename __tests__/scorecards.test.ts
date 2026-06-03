import { describe, it, expect } from "vitest";
import { deriveSubtaskStatus } from "@/lib/computed/subtasks";

describe("deriveSubtaskStatus", () => {
  it("date も decision も空なら pending", () => {
    expect(deriveSubtaskStatus("", undefined)).toBe("pending");
    expect(deriveSubtaskStatus("")).toBe("pending");
  });

  it("date があり decision が空なら planned", () => {
    expect(deriveSubtaskStatus("2026-05-01", undefined)).toBe("planned");
    expect(deriveSubtaskStatus("2026-05-01", "")).toBe("planned");
  });

  it("decision があれば done（date の有無は問わない）", () => {
    expect(deriveSubtaskStatus("2026-05-01", "通過")).toBe("done");
    expect(deriveSubtaskStatus("", "不合格")).toBe("done");
  });

  it("空白のみの decision は空扱いで done にならない", () => {
    expect(deriveSubtaskStatus("2026-05-01", "  ")).toBe("planned");
    expect(deriveSubtaskStatus("", "  ")).toBe("pending");
  });

  it("空白のみの date は空扱いで planned にならない", () => {
    expect(deriveSubtaskStatus("  ", undefined)).toBe("pending");
    expect(deriveSubtaskStatus("  ", "通過")).toBe("done");
  });
});
