import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isAccessProtectionEnabled,
  readAccessPassword,
  readAuthSecret,
  signAccessToken,
  getAuthCookieName,
} from "@/lib/auth/session";

const bodySchema = z.object({
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const configuredPassword = readAccessPassword();
  if (!configuredPassword) {
    return NextResponse.json(
      { error: "パスワード保護が有効になっていません" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "パスワードを入力してください" }, { status: 400 });
  }

  if (parsed.data.password !== configuredPassword) {
    return NextResponse.json({ error: "パスワードが違います" }, { status: 401 });
  }

  const token = await signAccessToken(parsed.data.password, readAuthSecret());
  const response = NextResponse.json({ ok: true });
  response.cookies.set(getAuthCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(getAuthCookieName(), "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}
