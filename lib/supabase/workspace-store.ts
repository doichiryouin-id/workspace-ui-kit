import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { type WorkspaceSnapshot } from "@/lib/workspace-sync/types";

const ROW_ID = "main";

export function isWorkspaceSyncEnabled(): boolean {
  return Boolean(
    process.env.SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

export function createSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type WorkspaceRow = {
  id: string;
  data: WorkspaceSnapshot;
  updated_at: string;
};

export async function loadWorkspaceSnapshot(): Promise<{
  data: WorkspaceSnapshot;
  updatedAt: string;
} | null> {
  const supabase = createSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("workspace_state")
    .select("data, updated_at")
    .eq("id", ROW_ID)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as Pick<WorkspaceRow, "data" | "updated_at">;
  return { data: row.data, updatedAt: row.updated_at };
}

export async function saveWorkspaceSnapshot(
  snapshot: WorkspaceSnapshot,
  expectedUpdatedAt?: string | null,
): Promise<{ updatedAt: string; conflict: boolean }> {
  const supabase = createSupabaseAdmin();
  if (!supabase) throw new Error("Supabase が未設定です");

  if (expectedUpdatedAt) {
    const current = await loadWorkspaceSnapshot();
    if (
      current &&
      new Date(current.updatedAt).getTime() >
        new Date(expectedUpdatedAt).getTime()
    ) {
      return { updatedAt: current.updatedAt, conflict: true };
    }
  }

  const { data, error } = await supabase
    .from("workspace_state")
    .upsert({
      id: ROW_ID,
      data: snapshot,
      updated_at: new Date().toISOString(),
    })
    .select("updated_at")
    .single();

  if (error) throw new Error(error.message);

  const row = data as Pick<WorkspaceRow, "updated_at">;
  return { updatedAt: row.updated_at, conflict: false };
}
