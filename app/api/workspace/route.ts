import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isWorkspaceSyncEnabled,
  loadWorkspaceSnapshot,
  saveWorkspaceSnapshot,
} from "@/lib/supabase/workspace-store";
import { workspaceSnapshotSchema } from "@/lib/workspace-sync/types";

const putBodySchema = z.object({
  data: workspaceSnapshotSchema,
  expectedUpdatedAt: z.string().nullable().optional(),
});

export async function GET() {
  if (!isWorkspaceSyncEnabled()) {
    return NextResponse.json({ enabled: false });
  }

  try {
    const row = await loadWorkspaceSnapshot();
    if (!row) {
      return NextResponse.json({ enabled: true, empty: true, updatedAt: null });
    }
    return NextResponse.json({
      enabled: true,
      empty: false,
      updatedAt: row.updatedAt,
      data: row.data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "読み込みに失敗しました";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function PUT(request: Request) {
  if (!isWorkspaceSyncEnabled()) {
    return NextResponse.json(
      { ok: false, error: "クラウド保存が有効になっていません" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "リクエストが不正です" },
      { status: 400 },
    );
  }

  const parsed = putBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "データ形式が正しくありません" },
      { status: 400 },
    );
  }

  try {
    const result = await saveWorkspaceSnapshot(
      parsed.data.data,
      parsed.data.expectedUpdatedAt,
    );
    if (result.conflict) {
      return NextResponse.json(
        {
          ok: false,
          conflict: true,
          error: "他の人が先に保存しました",
          updatedAt: result.updatedAt,
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true, updatedAt: result.updatedAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "保存に失敗しました";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
