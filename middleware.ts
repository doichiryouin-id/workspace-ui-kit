import { NextResponse, type NextRequest } from "next/server";

import {
  getAuthCookieName,
  isAccessProtectionEnabled,
  readAccessPassword,
  readAuthSecret,
  verifyAccessToken,
} from "@/lib/auth/session";

const PUBLIC_PREFIXES = ["/login", "/api/auth/login"];

/** Cron は cookie 不要。秘密鍵はルート側で検証する。 */
function isCronApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/cron/");
}

export async function middleware(request: NextRequest) {
  if (!isAccessProtectionEnabled()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (isCronApiPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(getAuthCookieName())?.value;
  const password = readAccessPassword();
  if (
    token &&
    password &&
    (await verifyAccessToken(token, password, readAuthSecret()))
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
