import { describe, it, expect } from "vitest";

import {
  aggregateReachForRange,
  aggregateReachLifetimeForVideo,
  parseReachReportCsv,
} from "@/lib/youtube/reporting-reach";

describe("parseReachReportCsv", () => {
  it("reach CSV をパースする", () => {
    const csv = [
      "date,channel_id,video_id,video_thumbnail_impressions,video_thumbnail_impressions_ctr",
      "2026-07-03,UCxxx,vid123,1000,0.02",
      "2026-07-04,UCxxx,vid123,500,0.04",
    ].join("\n");

    const rows = parseReachReportCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      date: "2026-07-03",
      videoId: "vid123",
      impressions: 1000,
      ctrRatio: 0.02,
    });
  });
});

describe("aggregateReachForRange", () => {
  const rows = parseReachReportCsv(
    [
      "date,channel_id,video_id,video_thumbnail_impressions,video_thumbnail_impressions_ctr",
      "2026-07-03,UCxxx,vid123,1000,0.02",
      "2026-07-04,UCxxx,vid123,500,0.04",
      "2026-07-03,UCxxx,other,999,0.01",
    ].join("\n"),
  );

  it("期間内の IMP と加重 CTR を集計", () => {
    const result = aggregateReachForRange(
      rows,
      "vid123",
      "2026-07-03",
      "2026-07-04",
    );
    expect(result).toEqual({
      impressions: 1500,
      ctrPercent: "2.7",
    });
  });

  it("動画の全期間 IMP/CTR を合算", () => {
    const lifetimeRows = parseReachReportCsv(
      [
        "date,channel_id,video_id,video_thumbnail_impressions,video_thumbnail_impressions_ctr",
        "2026-05-01,UCxxx,vid123,800,0.04",
        "2026-06-01,UCxxx,vid123,200,0.06",
      ].join("\n"),
    );
    expect(aggregateReachLifetimeForVideo(lifetimeRows, "vid123")).toEqual({
      impressions: 1000,
      ctrPercent: "4.4",
    });
  });
});
