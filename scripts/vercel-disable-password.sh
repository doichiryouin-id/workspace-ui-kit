#!/usr/bin/env bash
# Vercel 本番のパスワード保護をオフにする（要: npx vercel login 済み）
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Removing WORKSPACE_ACCESS_PASSWORD and AUTH_SECRET from Vercel (production)..."
for name in WORKSPACE_ACCESS_PASSWORD AUTH_SECRET; do
  npx vercel env rm "$name" production --yes 2>/dev/null || echo "  (skip: $name not set or already removed)"
done

echo "Redeploying..."
npx vercel --prod

echo "Done. Open https://workspace-ui-kit-lyart.vercel.app/ — should skip /login."
