# YouTube 分析の自動取得 — セットアップ手順

Pane 3 が YouTube から数値を自動取得するための設定です。

## 取得できる指標

| 指標 | 必要な設定 |
|------|-----------|
| 視聴回数・高評価・コメント | `YOUTUBE_API_KEY` |
| インプレッション・CTR・平均視聴率・平均視聴時間・登録者増 | OAuth 3項目 + リフレッシュトークン |

**B（フル）から始める場合** → 下の「Step 1〜4」をすべて実施。  
高評価・コメントも自動化したい場合は Step 1 の Data API も有効にして `YOUTUBE_API_KEY` を追加。

---

## Step 1: Google Cloud プロジェクト

1. [Google Cloud Console](https://console.cloud.google.com/) を開く
2. **新しいプロジェクト**を作成（例: `治療院YouTube`）
3. **API とサービス → ライブラリ** で以下を **有効化**
   - **YouTube Data API v3**
   - **YouTube Analytics API**

---

## Step 2: API キー（任意だが推奨）

1. **API とサービス → 認証情報 → 認証情報を作成 → API キー**
2. キーをコピー
3. （推奨）キーを編集 → **API の制限** → YouTube Data API v3 のみ

→ `.env.local` の `YOUTUBE_API_KEY=`

---

## Step 3: OAuth クライアント（Analytics 用）

1. **API とサービス → OAuth 同意画面**
   - ユーザータイプ: **外部**
   - アプリ名・連絡先メールを入力
   - スコープ追加: `https://www.googleapis.com/auth/yt-analytics.readonly`
   - **テストユーザー**に、チャンネル所有者の Google アカウントを追加

2. **認証情報 → 認証情報を作成 → OAuth クライアント ID**
   - アプリの種類: **デスクトップアプリ**
   - 作成後 **クライアント ID** と **クライアントシークレット** を控える

→ `.env.local` の `YOUTUBE_CLIENT_ID=` / `YOUTUBE_CLIENT_SECRET=`

---

## Step 4: リフレッシュトークン（1回だけ）

1. [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) を開く
2. 右上 **⚙** → **Use your own OAuth credentials** にチェック
3. Step 1 の Client ID / Secret を入力
4. 左 **Input your own scopes** に以下を入力して **Authorize APIs**
   ```
   https://www.googleapis.com/auth/yt-analytics.readonly
   ```
5. **チャンネル所有者**のアカウントでログイン → 許可
6. **Exchange authorization code for tokens** → **Refresh token** をコピー

→ `.env.local` の `YOUTUBE_REFRESH_TOKEN=`

`YOUTUBE_CHANNEL_ID` は通常 **空でOK**（認可したチャンネルが使われる）。

---

## Step 5: `.env.local` を置く

```bash
cd ~/src/workspace-ui-kit
cp .env.example .env.local
# エディタで YOUTUBE_* を埋める
```

例:

```env
YOUTUBE_API_KEY=AIza...
YOUTUBE_CLIENT_ID=xxxx.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=GOCSPX-...
YOUTUBE_REFRESH_TOKEN=1//...
```

---

## Step 6: 開発サーバーを再起動

```bash
npm run dev
```

環境変数は起動時に読み込まれるため、**必ず再起動**してください。

---

## Step 7: 設定確認

ブラウザまたはターミナルで:

```bash
curl -s http://localhost:3000/api/youtube-analytics/status | python3 -m json.tool
```

`dataApi: true` かつ `analyticsApi: true` ならフル設定完了。

---

## Step 8: アプリで試す

1. Pane 2 で枠を選ぶ
2. **YouTube 動画 URL** を URL 欄に入力
3. Pane 3 が自動取得（または「YouTube から再取得」）

**注意:** Analytics API は **自分のチャンネルの動画** のみ。他人の URL ではインプレッション等は空になります。

---

## うまくいかないとき

| 症状 | 対処 |
|------|------|
| 全部空 | `.env.local` の場所・スペル・dev サーバー再起動 |
| 視聴回数だけ | OAuth 3項目が未設定 or リフレッシュトークン無効 |
| 403 / OAuth エラー | テストユーザーに自分を追加したか、スコープが `yt-analytics.readonly` か |
| invalid_grant | Playground でリフレッシュトークンを再取得 |

---

## 本番（Vercel）でも使う場合

1. [Vercel Dashboard](https://vercel.com) → プロジェクト → **Settings → Environment Variables**
2. **Production**（必要なら Preview も）に以下を追加:

| 変数名 | 必須 | 用途 |
|--------|------|------|
| `YOUTUBE_CLIENT_ID` | マイルストーン IMP/CTR | OAuth |
| `YOUTUBE_CLIENT_SECRET` | 同上 | OAuth |
| `YOUTUBE_REFRESH_TOKEN` | 同上 | OAuth |
| `YOUTUBE_API_KEY` | 任意 | 視聴回数・高評価（Pane 3） |

3. **Deployments → 最新 → Redeploy**（変数追加だけでは反映されない）
4. 確認: `https://あなたのドメイン/api/youtube-analytics/status` で `analyticsApi: true`

Google Cloud 側では **YouTube Analytics API** に加え、Pane 4 の IMP/CTR 用に **YouTube Reporting API** も有効化してください。
