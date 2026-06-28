# YouTube 分析の自動取得 — セットアップ手順

Pane 3 / Pane 4 が YouTube から数値を自動取得するための設定です。

## 最短ルート（対話式）

```bash
cp .env.example .env.local   # 初回のみ
npm run setup:youtube-oauth  # リフレッシュトークン取得 → .env.local → Vercel 同期
```

Google Cloud の準備（Step 1〜3）が済んでいれば、Playground で取得した **Refresh token を貼り付けるだけ** で完了します。

---

## 取得できる指標

| 指標 | 必要な設定 |
|------|-----------|
| 視聴回数・高評価・コメント | `YOUTUBE_API_KEY` |
| 平均視聴率・平均視聴時間・登録者増 | OAuth 3項目 |
| Pane 4 マイルストーン IMP/CTR | OAuth 3項目 + **Reporting API** |

---

## Step 1: Google Cloud プロジェクト

1. [Google Cloud Console](https://console.cloud.google.com/) を開く
2. **新しいプロジェクト**を作成（例: `治療院YouTube`）
3. **API とサービス → ライブラリ** で以下を **有効化**
   - **YouTube Data API v3**
   - **YouTube Analytics API**
   - **YouTube Reporting API**（Pane 4 の IMP/CTR に必須）

---

## Step 2: API キー（任意だが推奨）

1. **API とサービス → 認証情報 → 認証情報を作成 → API キー**
2. キーをコピー
3. （推奨）キーを編集 → **API の制限** → YouTube Data API v3 のみ

→ `YOUTUBE_API_KEY`

---

## Step 3: OAuth クライアント（Analytics 用）

### 3a. OAuth 同意画面

1. **API とサービス → OAuth 同意画面**
   - ユーザータイプ: **外部**
   - アプリ名・連絡先メールを入力
   - スコープ追加: `https://www.googleapis.com/auth/yt-analytics.readonly`
   - **テストユーザー**に、**チャンネル所有者**の Google アカウントを追加

### 3b. OAuth クライアント ID

Playground でリフレッシュトークンを取るため **Web アプリケーション** を作成します。

1. **認証情報 → 認証情報を作成 → OAuth クライアント ID**
   - アプリの種類: **Web アプリケーション**
   - 名前: 任意（例: `YouTube Analytics`）
   - **承認済みのリダイレクト URI** に以下を **1行追加**:
     ```
     https://developers.google.com/oauthplayground
     ```
2. 作成後 **クライアント ID** と **クライアントシークレット** を控える

→ `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET`

---

## Step 4: リフレッシュトークン（OAuth Playground）

1. [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) を開く
2. 右上 **⚙** をクリック
   - **Use your own OAuth credentials** にチェック
   - OAuth Client ID / Client Secret を入力（Step 3b と同じ）
   - **Force prompt** を ON（refresh_token が空になるときの対策）
3. 左下 **Input your own scopes** に以下を入力 → **Authorize APIs**
   ```
   https://www.googleapis.com/auth/yt-analytics.readonly
   ```
4. **チャンネル所有者**の Google アカウントでログイン → **許可**
5. **Exchange authorization code for tokens** をクリック
6. 右側 JSON の **`refresh_token`** をコピー（`1//` で始まる長い文字列）

→ `YOUTUBE_REFRESH_TOKEN`

`YOUTUBE_CHANNEL_ID` は通常 **空でOK**（認可したチャンネルが使われる）。

### 自動化スクリプト

```bash
npm run setup:youtube-oauth
```

Refresh token の貼り付け、`.env.local` 保存、Vercel Production 同期・Redeploy まで対話式で行います。

---

## Step 5: 環境変数を置く

```bash
cp .env.example .env.local
# または npm run setup:youtube-oauth
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

```bash
curl -s http://localhost:3000/api/youtube-analytics/status | python3 -m json.tool
```

`dataApi: true` かつ `analyticsApi: true` なら OAuth 設定完了。

---

## Step 8: アプリで試す

1. Pane 2 で枠を選ぶ
2. **YouTube 動画 URL** を URL 欄に入力
3. Pane 3「YouTube から再取得」
4. Pane 4「マイルストーン更新」

**注意:** 自分のチャンネルの動画のみ。reach レポートはジョブ作成後 **24〜48時間** で日次 CSV が揃うことがあります。

---

## うまくいかないとき

| 症状 | 対処 |
|------|------|
| `YouTube OAuth 未設定` | Vercel Environment Variables に 3項目を設定して Redeploy |
| refresh_token が空 | Playground ⚙ の **Force prompt** ON で再認可 |
| `redirect_uri_mismatch` | OAuth クライアントに Playground の URI を追加（Step 3b） |
| 403 / OAuth エラー | テストユーザーに自分を追加、スコープ確認 |
| invalid_grant | Playground でリフレッシュトークンを再取得 |
| IMP/CTR だけ 0 件 | **Reporting API** 有効化、reach ジョブ生成待ち |

---

## 本番（Vercel）

```bash
npm run sync:youtube-env-vercel
```

または Vercel Dashboard → **Settings → Environment Variables** → **Redeploy**

| 変数名 | 必須 |
|--------|------|
| `YOUTUBE_CLIENT_ID` | マイルストーン |
| `YOUTUBE_CLIENT_SECRET` | 同上 |
| `YOUTUBE_REFRESH_TOKEN` | 同上 |
| `YOUTUBE_API_KEY` | 任意 |

確認: `https://workspace-ui-kit-lyart.vercel.app/api/youtube-analytics/status`
