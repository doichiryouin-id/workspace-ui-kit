import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { authorizeCronRequest } from "@/app/api/cron/youtube-sync/route";

describe("authorizeCronRequest", () => {
  const prev = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = "test-cron-secret";
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prev;
  });

  it("CRON_SECRET 未設定は 503", () => {
    delete process.env.CRON_SECRET;
    const result = authorizeCronRequest(
      new Request("http://localhost/api/cron/youtube-sync"),
    );
    expect(result).toEqual({
      ok: false,
      status: 503,
      error: "CRON_SECRET が未設定です",
    });
  });

  it("Bearer 不正は 401", () => {
    const result = authorizeCronRequest(
      new Request("http://localhost/api/cron/youtube-sync", {
        headers: { Authorization: "Bearer wrong" },
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  it("正しい Bearer は OK", () => {
    const result = authorizeCronRequest(
      new Request("http://localhost/api/cron/youtube-sync", {
        headers: { Authorization: "Bearer test-cron-secret" },
      }),
    );
    expect(result).toEqual({ ok: true, status: 200 });
  });
});
