import { describe, it, expect } from "vitest";

import {
  assertFetchablePublicUrl,
  mergeUrlMetadataIntoProfile,
  parseUrlMetadataFromHtml,
} from "@/lib/url-metadata";

describe("assertFetchablePublicUrl", () => {
  it("http(s) の公開 URL を許可する", () => {
    expect(assertFetchablePublicUrl("https://example.com/paper").href).toBe(
      "https://example.com/paper",
    );
  });

  it("localhost は拒否する", () => {
    expect(() => assertFetchablePublicUrl("http://localhost/")).toThrow();
  });
});

describe("parseUrlMetadataFromHtml", () => {
  it("og:title / og:description を読む", () => {
    const html = `<!DOCTYPE html><html><head>
      <meta property="og:title" content="四十肩のセルフケア" />
      <meta property="og:description" content="一般向けの解説です。" />
      <meta property="og:site_name" content="Example Journal" />
    </head><body></body></html>`;
    const meta = parseUrlMetadataFromHtml(html, "https://example.com/article");
    expect(meta.title).toBe("四十肩のセルフケア");
    expect(meta.description).toBe("一般向けの解説です。");
    expect(meta.siteName).toBe("Example Journal");
  });
});

describe("mergeUrlMetadataIntoProfile", () => {
  it("空のタイトル・説明にメタデータを入れる", () => {
    const merged = mergeUrlMetadataIntoProfile(
      {
        name: "",
        referenceUrl: "",
        outline: "",
        descriptionNotes: "",
      },
      {
        url: "https://example.com/a",
        title: "論文タイトル",
        description: "要約文",
        siteName: "example.com",
      },
    );
    expect(merged.name).toBe("論文タイトル");
    expect(merged.descriptionNotes).toBe("要約文");
    expect(merged.referenceUrl).toBe("https://example.com/a");
  });

  it("既存の説明があるときは追記する", () => {
    const merged = mergeUrlMetadataIntoProfile(
      {
        name: "既存タイトル",
        referenceUrl: "",
        outline: "",
        descriptionNotes: "自分のメモ",
      },
      {
        url: "https://example.com/a",
        title: "論文タイトル",
        description: "要約文",
        siteName: "Journal",
      },
    );
    expect(merged.name).toBe("既存タイトル");
    expect(merged.descriptionNotes).toContain("自分のメモ");
    expect(merged.descriptionNotes).toContain("要約文");
  });
});
