import { afterEach, describe, expect, it } from "vitest";

import {
  DEFAULT_PANE_WIDTHS,
  MAX_PANE_WIDTHS,
  MIN_PANE_WIDTHS,
} from "@/hooks/useWorkspacePaneWidths";
import { isWorkspaceSyncEnabled } from "@/lib/supabase/workspace-store";

const PANE_WIDTHS_KEY = "workspace-ui-kit:pane-widths";

describe("memory patterns", () => {
  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    localStorage.clear();
  });

  it("pattern 2: Supabase 未設定ならクラウド同期は無効（ローカルモード）", () => {
    expect(isWorkspaceSyncEnabled()).toBe(false);
  });

  it("pattern 2: Supabase 環境変数が揃うとクラウド同期が有効", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    expect(isWorkspaceSyncEnabled()).toBe(true);
  });

  it("pattern 3: ペイン幅は localStorage に保存・復元される", () => {
    localStorage.setItem(
      PANE_WIDTHS_KEY,
      JSON.stringify({ pane1: 300, pane2: 500, pane3: 600, pane4: 400 }),
    );

    const raw = localStorage.getItem(PANE_WIDTHS_KEY);
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw!) as Partial<
      Record<keyof typeof DEFAULT_PANE_WIDTHS, number>
    >;

    expect(parsed.pane1).toBe(300);
    expect(parsed.pane2).toBe(500);

    const clamp = (key: keyof typeof DEFAULT_PANE_WIDTHS, value: number) =>
      Math.min(MAX_PANE_WIDTHS[key], Math.max(MIN_PANE_WIDTHS[key], value));

    expect(clamp("pane1", parsed.pane1 ?? DEFAULT_PANE_WIDTHS.pane1)).toBe(300);
  });

  it("pattern 3: 企画データ用の localStorage キーはペイン幅だけ", () => {
    const keys = Object.keys(localStorage);
    expect(keys).not.toContain("workspace-channels");
    expect(keys).not.toContain("workspace-video-plans");
    expect(PANE_WIDTHS_KEY).toBe("workspace-ui-kit:pane-widths");
  });
});
