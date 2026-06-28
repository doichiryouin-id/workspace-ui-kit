#!/usr/bin/env node
/**
 * YouTube OAuth セットアップ（リフレッシュトークン取得 + .env.local 保存 + Vercel 同期）
 *
 * 事前準備（Google Cloud Console）:
 * 1. YouTube Data API v3 / Analytics API / Reporting API を有効化
 * 2. OAuth 同意画面（外部）+ テストユーザーにチャンネル所有者を追加
 * 3. OAuth クライアント（Web アプリ）を作成
 *    - リダイレクト URI: https://developers.google.com/oauthplayground
 *
 * 使い方: npm run setup:youtube-oauth
 */

import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { readFile, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ENV_LOCAL = path.join(ROOT, ".env.local");
const SCOPE = "https://www.googleapis.com/auth/yt-analytics.readonly";
const PLAYGROUND_REDIRECT = "https://developers.google.com/oauthplayground";

const rl = createInterface({ input: process.stdin, output: process.stdout });

function trim(s) {
  return s.trim();
}

async function prompt(label, { defaultValue = "", secret = false } = {}) {
  const suffix = defaultValue ? ` [${secret ? "***" : defaultValue}]` : "";
  const answer = trim(await rl.question(`${label}${suffix}: `));
  return answer || defaultValue;
}

async function readExistingEnv() {
  try {
    await access(ENV_LOCAL, constants.F_OK);
    const text = await readFile(ENV_LOCAL, "utf8");
    const map = new Map();
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) map.set(m[1], m[2]);
    }
    return map;
  } catch {
    return new Map();
  }
}

function upsertEnvLines(existingText, entries) {
  const lines = existingText ? existingText.split("\n") : [];
  const keys = new Set(entries.map(([k]) => k));

  const kept = lines.filter((line) => {
    const m = line.match(/^([A-Z0-9_]+)=/);
    return !m || !keys.has(m[1]);
  });

  while (kept.length > 0 && kept[kept.length - 1] === "") kept.pop();

  const added = entries.map(([k, v]) => `${k}=${v}`);
  return [...kept, ...added, ""].join("\n");
}

async function exchangeCode({ clientId, clientSecret, code }) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: PLAYGROUND_REDIRECT,
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      json.error_description || json.error || `token exchange failed (${res.status})`,
    );
  }
  if (!json.refresh_token) {
    throw new Error(
      "refresh_token が返りませんでした。Playground で「Force prompt」をオンにして再認可するか、Google アカウントの連携を解除してからやり直してください。",
    );
  }
  return json;
}

async function verifyRefreshToken({ clientId, clientSecret, refreshToken }) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error(
      json.error_description || json.error || "refresh_token の検証に失敗",
    );
  }
  return json.access_token;
}

function runVercel(args, input) {
  return spawnSync("npx", ["vercel", ...args], {
    cwd: ROOT,
    input,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}

async function syncToVercel(entries) {
  const whoami = runVercel(["whoami"]);
  if (whoami.status !== 0) {
    console.log("\n⚠ Vercel CLI 未ログインのため本番同期をスkipします。");
    console.log("  後から: npm run sync:youtube-env-vercel");
    return false;
  }

  console.log("\n=== Vercel Production へ同期 ===");
  for (const [key, value] of entries) {
    if (!value) continue;
    // 既存を削除してから追加（冪等）
    runVercel(["env", "rm", key, "production", "--yes"]);
    const add = runVercel(["env", "add", key, "production"], `${value}\n`);
    if (add.status !== 0) {
      console.error(`  ✗ ${key}: ${add.stderr || add.stdout}`);
      return false;
    }
    console.log(`  ✓ ${key}`);
  }

  console.log("\nRedeploy 中...");
  const deploy = runVercel(["--prod", "--yes"]);
  if (deploy.status !== 0) {
    console.error(deploy.stderr || deploy.stdout);
    console.log("\n⚠ Redeploy に失敗しました。Vercel Dashboard から手動 Redeploy してください。");
    return false;
  }
  console.log("✓ Production Redeploy 完了");
  return true;
}

async function main() {
  console.log(`
YouTube OAuth セットアップ
========================

Google Cloud で未実施の場合は先に以下を完了してください:
  • API 有効化: YouTube Data API v3 / Analytics API / Reporting API
  • OAuth 同意画面（外部）+ テストユーザー追加
  • OAuth クライアント（Web アプリ）
    リダイレクト URI: ${PLAYGROUND_REDIRECT}

詳細: docs/YOUTUBE-ANALYTICS-SETUP.md
`);

  const existing = await readExistingEnv();

  const clientId = await prompt("YOUTUBE_CLIENT_ID", {
    defaultValue: existing.get("YOUTUBE_CLIENT_ID") ?? "",
  });
  const clientSecret = await prompt("YOUTUBE_CLIENT_SECRET", {
    defaultValue: existing.get("YOUTUBE_CLIENT_SECRET") ?? "",
    secret: Boolean(existing.get("YOUTUBE_CLIENT_SECRET")),
  });

  if (!clientId || !clientSecret) {
    console.error("\nClient ID / Secret が必要です。Google Cloud Console で作成してください。");
    process.exit(1);
  }

  console.log(`
--- OAuth Playground 手順 ---

1. ブラウザで開く: https://developers.google.com/oauthplayground/
2. 右上 ⚙ → 「Use your own OAuth credentials」にチェック
3. OAuth Client ID / Secret を入力（上記と同じ）
4. 左下「Input your own scopes」に以下を貼り付け → Authorize APIs

   ${SCOPE}

5. チャンネル所有者の Google アカウントでログイン → 許可
6. 「Exchange authorization code for tokens」を押す
7. 表示された Refresh token をコピー

※ refresh_token が空のときは ⚙ の「Force prompt」を ON にして Step 4〜6 をやり直し
`);

  const apiKey = await prompt("YOUTUBE_API_KEY（任意・Enter でスキップ）", {
    defaultValue: existing.get("YOUTUBE_API_KEY") ?? "",
  });

  let refreshToken = trim(
    await prompt("YOUTUBE_REFRESH_TOKEN（Playground から貼り付け）", {
      defaultValue: existing.get("YOUTUBE_REFRESH_TOKEN") ?? "",
      secret: Boolean(existing.get("YOUTUBE_REFRESH_TOKEN")),
    }),
  );

  // Playground から code だけ持ってきた場合のフォールバック
  if (!refreshToken) {
    const code = trim(
      await prompt("または Authorization code（Playground Step 2 の code）"),
    );
    if (code) {
      console.log("\nAuthorization code を refresh_token に交換中...");
      const tokens = await exchangeCode({ clientId, clientSecret, code });
      refreshToken = tokens.refresh_token;
      console.log("✓ refresh_token 取得完了");
    }
  }

  if (!refreshToken) {
    console.error("\nYOUTUBE_REFRESH_TOKEN が必要です。");
    process.exit(1);
  }

  console.log("\nrefresh_token を検証中...");
  await verifyRefreshToken({ clientId, clientSecret, refreshToken });
  console.log("✓ OAuth トークン有効");

  const entries = [
    ["YOUTUBE_CLIENT_ID", clientId],
    ["YOUTUBE_CLIENT_SECRET", clientSecret],
    ["YOUTUBE_REFRESH_TOKEN", refreshToken],
  ];
  if (apiKey) entries.unshift(["YOUTUBE_API_KEY", apiKey]);

  const prev = await readFile(ENV_LOCAL, "utf8").catch(() => "");
  await writeFile(ENV_LOCAL, upsertEnvLines(prev, entries), "utf8");
  console.log(`\n✓ ${path.relative(ROOT, ENV_LOCAL)} を更新しました`);

  const sync = trim(
    await prompt("\nVercel Production に同期して Redeploy しますか？ (y/N)", {
      defaultValue: "y",
    }),
  );
  if (sync.toLowerCase() === "y" || sync.toLowerCase() === "yes") {
    await syncToVercel(entries);
  } else {
    console.log("\n後から同期: npm run sync:youtube-env-vercel");
  }

  console.log(`
--- 確認 ---

ローカル:  npm run dev  →  curl -s http://localhost:3000/api/youtube-analytics/status
本番:      https://workspace-ui-kit-lyart.vercel.app/api/youtube-analytics/status

analyticsApi: true なら Pane 4「マイルストーン更新」が動きます。
`);
}

main()
  .catch((err) => {
    console.error(`\n✗ ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  })
  .finally(() => rl.close());
