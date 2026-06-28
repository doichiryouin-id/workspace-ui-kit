#!/usr/bin/env bash
# .env.local の YOUTUBE_* を Vercel Production に同期して Redeploy
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env.local ]]; then
  echo "✗ .env.local がありません。先に npm run setup:youtube-oauth を実行してください。"
  exit 1
fi

if ! npx vercel whoami >/dev/null 2>&1; then
  echo "✗ Vercel CLI 未ログイン。npx vercel login を実行してください。"
  exit 1
fi

echo "=== YOUTUBE_* を Vercel Production へ同期 ==="
for key in YOUTUBE_API_KEY YOUTUBE_CLIENT_ID YOUTUBE_CLIENT_SECRET YOUTUBE_REFRESH_TOKEN YOUTUBE_CHANNEL_ID YOUTUBE_REACH_REPORT_JOB_ID; do
  value=$(grep -E "^${key}=" .env.local 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'" || true)
  if [[ -z "${value}" ]]; then
    continue
  fi
  npx vercel env rm "$key" production --yes 2>/dev/null || true
  printf '%s' "$value" | npx vercel env add "$key" production
  echo "  ✓ $key"
done

echo ""
echo "Redeploy 中..."
npx vercel --prod --yes
echo "✓ 完了"
