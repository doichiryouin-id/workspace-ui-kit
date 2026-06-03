/** @vitest-environment jsdom */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublishScheduleCalendar } from "@/components/workspace/PublishScheduleCalendar";
import { type VideoPlan, type VideoPlanProfile } from "@/lib/schema";

const emptyProfile = (): VideoPlanProfile => ({
  name: "",
  referenceUrl: "",
  source: "",
  assignee: "",
  priority: "",
  availableStartDate: "",
  productionProgressNote: "",
  outline: "",
  descriptionNotes: "",
});

function plan(
  id: string,
  availableStartDate: string,
  over: Partial<VideoPlan> = {},
): VideoPlan {
  return {
    id,
    stage: "inProduction",
    subtasks: [],
    archived: false,
    profile: {
      ...emptyProfile(),
      name: `Plan ${id}`,
      availableStartDate,
    },
    ...over,
  };
}

describe("PublishScheduleCalendar", () => {
  it("公開予定日のセルに publish-schedule-day クラスを付与する", () => {
    const { container } = render(
      <PublishScheduleCalendar
        videoPlans={[
          plan("a", "2026-05-25"),
          plan("b", "2026-06-01"),
        ]}
      />,
    );

    const may25 = container.querySelector(
      '[data-day="2026-05-25"]:not(.rdp-hidden)',
    );
    expect(may25?.className).toContain("publish-schedule-day");
    expect(may25?.querySelector(".publish-schedule-dot")).toBeTruthy();
  });
});
