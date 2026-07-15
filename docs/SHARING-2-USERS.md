# 2名で共有する手順

このワークスペースを **2人で同じデータを編集** するための設定です。

## 仕組み

- データは **Supabase**（無料枠可）に1つ保存
- 編集は **約1.5秒後に自動保存**
- 相手の更新は **約5秒ごと**（およびタブ復帰時）に検知。未編集なら自動反映、編集中なら「最新を反映」
- **アクセス制限（任意）** — `WORKSPACE_ACCESS_PASSWORD` を設定した場合のみログイン画面が出る

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

| 変数名 | 値 | 必須 |
|--------|-----|------|
| `SUPABASE_URL` | Supabase の URL | 共有するなら必須 |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role キー | 共有するなら必須 |
| `WORKSPACE_ACCESS_PASSWORD` | 共有パスワード | **任意**（未設定 = パスワードなし） |
| `AUTH_SECRET` | ランダム文字列 | パスワードを使うときのみ |
| `YOUTUBE_*` | API キー等 | 任意（分析自動取得） |

4. Deploy

### パスワードなしで開きたい場合（本番）

Vercel Dashboard → **Settings → Environment Variables** で以下を **削除**（または未設定のまま）して **Redeploy**:

- `WORKSPACE_ACCESS_PASSWORD`
- `AUTH_SECRET`（パスワードを使わないなら不要）

URL を開くと **いきなり4ペイン画面** が表示されます。

### パスワードありに戻したい場合

上記2変数を再設定して Redeploy するだけです（コード変更は不要）。

## 3. 2名で使う

1. 表示された URL（例: `https://xxx.vercel.app`）を共有
2. パスワードを設定している場合のみ、両方とも **同じパスワード** でログイン
3. 両方とも画面上部が **「クラウド同期 ON」** になっていることを確認
4. 片方が編集して約1.5秒後に保存 → もう片方は **自分で編集していないとき自動で反映**（約5秒ごと／タブを開き直したときも即反映）
5. 自分が編集中に相手が保存した場合のみ「相手が更新しました」と出る → **最新を反映** を押す（クラウドから取り直して画面に載せます。「このまま編集」だと保存時に競合警告が出ます）

> 片方が `localhost`、もう片方が本番 URL だと同期されません。必ず **同じ本番 URL** を開いてください。

## ローカル開発で共有を試す

`.env.local` に Supabase の2変数を入れて `npm run dev`。

- パスワード保護は **任意** — `WORKSPACE_ACCESS_PASSWORD` をコメントアウトまたは未設定なら、ログインなしで開けます
- 同期バーが **「クラウド同期 ON」** になれば Supabase 連携成功です

## 注意

- **同時に同じ枠を編集** すると、保存時に競合警告が出ます。「最新を反映」で相手の内容を取り込めます
- **パスワードなし** の場合、URL を知っている人は誰でも閲覧・編集できます
- **サムネ画像** は Supabase Storage（`thumbnails` バケット）に保存されます
- `service_role` キーは **Git にコミットしない**

## まだ設定していない場合

Supabase 未設定のときは **ローカルモード**（リロードで元に戻る）で動作します。
