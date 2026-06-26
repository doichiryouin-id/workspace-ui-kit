# 2名で共有する手順

このワークスペースを **2人で同じデータを編集** するための設定です。

## 仕組み

- データは **Supabase**（無料枠可）に1つ保存
- 編集は **約1.5秒後に自動保存**
- 相手の更新は **約12秒ごと** に検知（「最新を反映」ボタン）
- **共有パスワード** で2名だけがアクセス

## 1. Supabase を用意（5分）

1. [supabase.com](https://supabase.com) でアカウント作成
2. 新規プロジェクト作成
3. **SQL Editor** で [`supabase/schema.sql`](../supabase/schema.sql) を実行
4. **Settings → API** から以下を控える
   - Project URL → `SUPABASE_URL`
   - `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY`

## 2. Vercel にデプロイ（5分）

1. GitHub に `workspace-ui-kit` を push
2. [vercel.com](https://vercel.com) → Import Project
3. **Environment Variables** に設定:

| 変数名 | 値 |
|--------|-----|
| `SUPABASE_URL` | Supabase の URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role キー |
| `WORKSPACE_ACCESS_PASSWORD` | 2人だけが知るパスワード |
| `AUTH_SECRET` | ランダム文字列（例: `openssl rand -hex 32`） |
| `YOUTUBE_*` | （任意）分析自動取得 |

4. Deploy

## 3. 2名で使う

1. 表示された URL（例: `https://xxx.vercel.app`）を共有
2. 両方とも **同じパスワード** でログイン
3. 片方が編集すると、もう片方に「相手が更新しました」と出る → **最新を反映**

## ローカル開発で共有を試す

`.env.local` に Supabase の3変数 + パスワードを入れて `npm run dev`。

同期バーが **「クラウド同期 ON」** になれば成功です。

## 注意

- **同時に同じ枠を編集** すると、後から保存した方が優先されます（競合時は警告）
- **サムネ画像** は Supabase が設定されている本番では **Supabase Storage**（`thumbnails` バケット）に保存されます。初回アップロード時にバケットが自動作成されます
- Supabase 未設定のローカル開発では `data/thumbnails/`（Vercel 上は `/tmp`）に保存され、**再デプロイで消える** 可能性があります
- `service_role` キーは **Git にコミットしない**

## まだ設定していない場合

Supabase 未設定のときは **ローカルモード**（リロードで元に戻る）で動作します。
