import { format } from "date-fns";
import { describe, it, expect } from "vitest";

import { type VideoPlan, type VideoPlanProfile } from "@/lib/schema";
import {
  getNextPublishForSeries,
  getSeriesVideoSchedule,
  getScheduledPublishDates,
  getScheduledPublishIsoDates,
  getUpcomingPublishSchedule,
} from "@/lib/computed/publish-schedule";

const emptyVideoPlanProfile = (): VideoPlanProfile => ({
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

function candidate(
  id: string,
  name: string,
  profile: Partial<VideoPlanProfile>,
  over: Partial<VideoPlan> = {},
): VideoPlan {
  return {
    id,
    stage: "inProduction",
    subtasks: [],
    archived: false,
    profile: { ...emptyVideoPlanProfile(), name, ...profile },
    ...over,
  };
}

describe("getScheduledPublishIsoDates", () => {
  it("公開予定日 ISO 文字列を返す（アーカイブ・空は除外）", () => {
    const isos = getScheduledPublishIsoDates([
      candidate("a", "A", {
        availableStartDate: "2026-06-01",
        source: "本編",
      }),
      candidate(
        "b",
        "B",
        { availableStartDate: "2026-05-25", source: "本編" },
        { archived: true },
      ),
      candidate("c", "C", { availableStartDate: "", source: "本編" }),
    ]);
    expect(isos).toEqual(["2026-06-01"]);
  });
});

describe("getScheduledPublishDates", () => {
  it("公開予定日がある非アーカイブ企画の日付を返す", () => {
    const dates = getScheduledPublishDates([
      candidate("a", "A", {
        availableStartDate: "2026-06-01",
        source: "本編",
      }),
      candidate(
        "b",
        "B",
        { availableStartDate: "2026-05-25", source: "本編" },
        { archived: true },
      ),
      candidate("c", "C", { availableStartDate: "", source: "本編" }),
    ]);
    expect(dates).toHaveLength(1);
    expect(format(dates[0]!, "yyyy-MM-dd")).toBe("2026-06-01");
  });
});

describe("getUpcomingPublishSchedule", () => {
  it("公開予定日がある企画を日付順に返す", () => {
    const list = getUpcomingPublishSchedule([
      candidate("a", "A", {
        availableStartDate: "2026-06-15",
        source: "本編",
      }),
      candidate("b", "B", {
        availableStartDate: "2026-06-01",
        source: "本編",
      }),
    ]);
    expect(list.map((i) => i.isoDate)).toEqual(["2026-06-01", "2026-06-15"]);
  });

  it("アーカイブ済みは除外する", () => {
    const list = getUpcomingPublishSchedule([
      candidate(
        "a",
        "A",
        { availableStartDate: "2026-05-01", source: "本編" },
        { archived: true },
      ),
    ]);
    expect(list).toHaveLength(0);
  });
});

describe("getSeriesVideoSchedule", () => {
  it("シリーズに属する動画を日付順で返す", () => {
    const list = getSeriesVideoSchedule(
      [
        candidate("a", "A", {
          availableStartDate: "2026-06-01",
          source: "本編",
        }),
        candidate("b", "B", {
          availableStartDate: "2026-05-25",
          source: "本編",
        }),
        candidate("c", "C", { source: "本編", availableStartDate: "" }),
      ],
      "本編",
    );
    expect(list.map((i) => i.isoDate)).toEqual(["2026-05-25", "2026-06-01", ""]);
    expect(list[2]?.title).toBe("C");
  });
});

describe("getNextPublishForSeries", () => {
  it("シリーズ名で絞り込んで次の1件を返す", () => {
    const next = getNextPublishForSeries(
      [
        candidate("a", "A", {
          availableStartDate: "2026-05-25",
          source: "本編",
        }),
        candidate("b", "B", {
          availableStartDate: "2026-06-01",
          source: "ネタ箱",
        }),
      ],
      "本編",
    );
    expect(next?.isoDate).toBe("2026-05-25");
  });
});
