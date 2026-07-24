import { NextResponse } from "next/server";

import { syncWorkspaceYouTubeAnalytics } from "@/lib/youtube/sync-workspace-analytics";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function readCronSecret(): string | undefined {
  return process.env.CRON_SECRET?.trim() || undefined;
}

export function authorizeCronRequest(request: Request): {
  ok: boolean;
  status: number;
  error?: string;
} {
  const secret = readCronSecret();
  if (!secret) {
    return {
      ok: false,
      status: 503,
      error: "CRON_SECRET が未設定です",
    };
  }

  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  const token = match?.[1]?.trim() ?? "";
  if (!token || token !== secret) {
    return { ok: false, status: 401, error: "認証に失敗しました" };
  }

  return { ok: true, status: 200 };
}

/** Vercel Cron（毎日 10:00 JST = UTC 01:00）および手動トリガー用。 */
export async function GET(request: Request) {
  const auth = authorizeCronRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const result = await syncWorkspaceYouTubeAnalytics();
    const status = result.saved || result.errors.length === 0 ? 200 : 502;
    return NextResponse.json(result, { status });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "YouTube 定期同期に失敗しました",
      },
      { status: 502 },
    );
  }
}
