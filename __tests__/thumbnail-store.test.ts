import { describe, expect, it } from "vitest";

import {
  contentTypeForFilename,
} from "@/lib/thumbnails/store";

describe("contentTypeForFilename", () => {
  it("拡張子から Content-Type を返す", () => {
    expect(contentTypeForFilename("sch-06-1.png")).toBe("image/png");
    expect(contentTypeForFilename("thumb.jpg")).toBe("image/jpeg");
    expect(contentTypeForFilename("unknown.bin")).toBe("application/octet-stream");
  });
});
