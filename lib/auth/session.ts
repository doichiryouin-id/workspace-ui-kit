const COOKIE_NAME = "ws_auth";

export function getAuthCookieName(): string {
  return COOKIE_NAME;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function signAccessToken(
  password: string,
  secret: string,
): Promise<string> {
  return hmacSha256Hex(secret, `ws:${password}`);
}

export async function verifyAccessToken(
  token: string,
  password: string,
  secret: string,
): Promise<boolean> {
  const expected = await signAccessToken(password, secret);
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export function readAuthSecret(): string {
  return process.env.AUTH_SECRET ?? "dev-only-change-me";
}

export function readAccessPassword(): string | undefined {
  return process.env.WORKSPACE_ACCESS_PASSWORD?.trim() || undefined;
}

export function isAccessProtectionEnabled(): boolean {
  return Boolean(readAccessPassword());
}
