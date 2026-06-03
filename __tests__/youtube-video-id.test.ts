import { describe, it, expect } from "vitest";

import { parseYouTubeVideoId } from "@/lib/youtube/video-id";
import {
  formatIso8601Duration,
  formatRatioAsPercent,
  formatSecondsDuration,
} from "@/lib/youtube/format";

describe("parseYouTubeVideoId", () => {
  it("11 文字 ID をそのまま受け付ける", () => {
    expect(parseYouTubeVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("watch URL から ID を取り出す", () => {
    expect(
      parseYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("youtu.be / shorts / embed に対応", () => {
    expect(parseYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
    expect(
      parseYouTubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
    expect(
      parseYouTubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("無効な文字列は null", () => {
    expect(parseYouTubeVideoId("")).toBeNull();
    expect(parseYouTubeVideoId("https://example.com")).toBeNull();
  });
});

describe("youtube format helpers", () => {
  it("ISO 8601 duration", () => {
    expect(formatIso8601Duration("PT4M5S")).toBe("4:05");
    expect(formatIso8601Duration("PT1H2M3S")).toBe("62:03");
  });

  it("seconds and ratio", () => {
    expect(formatSecondsDuration(245)).toBe("4:05");
    expect(formatRatioAsPercent(0.041)).toBe("4.1");
  });
});
