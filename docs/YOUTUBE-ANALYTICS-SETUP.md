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

### 3a. OAuth 同意画面（Google Auth Platform）

Google Cloud の UI は **「Google Auth Platform」** に統合されています（旧「OAuth 同意画面」メニューはありません）。

1. 左メニュー **Google Auth Platform**（または **API とサービス → Google Auth Platform**）
2. **対象**（英: Audience）タブを開く
3. **ユーザーの種類** で **外部**（External）を選ぶ  
   - 個人 Gmail のプロジェクトでは **内部** は選べません → **外部** が正解
4. **テストユーザー** に **チャンネル所有者の Gmail** を追加（本番公開前の一時利用時）
5. **データアクセス**（Data access）タブ → **スコープを追加**  
   `https://www.googleapis.com/auth/yt-analytics.readonly`
6. **ブランディング**（Branding）タブ → アプリ名・連絡先メールを入力して保存
7. **公開ステータスを In production にする**（下記「7日で切れる問題」参照）

### ⚠ 7日で切れる問題（Testing のままは不可）

Google のルールで、同意画面が **Testing** のときの refresh token は **発行から約7日で必ず失効**します。  
トークンを再発行しても、**Testing のままならまた7日で切れます**。

| 公開ステータス | refresh token |
|----------------|---------------|
| **Testing** | **約7日で失効**（再発行しても同じ） |
| **In production** | 実質無期限（取り消し・6ヶ月未使用・秘密鍵変更などで失効し得る） |

**やること（一度だけ）:**

1. [Google Auth Platform → Audience](https://console.cloud.google.com/auth/audience) を開く
2. Publishing status が **Testing** なら **Publish app** → **In production**
3. 未検証アプリの警告が出ても、**自分（チャンネル所有者）だけが使うならそのままで可**（社外に配らない）
4. **その後**に OAuth Playground で refresh token を **取り直す**（古い Testing 発行分は捨てる）
5. Vercel の `YOUTUBE_REFRESH_TOKEN` を更新して Redeploy

※ 以前「期限切れしないようにした」つもりでも、Consent が Testing のままだとまた7日で落ちます。  
※ Production にしたあと **再認可していない**と、Vercel に残っているのはまだ Testing 時代のトークンです。

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
   - **Force prompt** プルダウン → **Consent screen**（refresh_token が空になるときの対策）
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
3. Pane 3「YouTube から再取得」（予備。通常は朝の自動取得で足りる）
4. Pane 4「マイルストーン更新」（同上）

**注意:** 自分のチャンネルの動画のみ。reach レポートはジョブ作成後 **24〜48時間** で日次 CSV が揃うことがあります。

---

## 毎日 10:00 JST の自動同期（Vercel Cron）

本番では **毎日 10:00（日本時間）** に公開済み動画（公開日 + YouTube URL）の

- Pane 3 累計（視聴・維持率など。IMP/CTR の reach はスキップ）
- Pane 4 マイルストーン（24h / 3日 / 1週間 / 1ヶ月）

を取得し、**Supabase `workspace_state` を直接更新**します。ワークスペースを開くと最新値が読み込まれます。

| 項目 | 内容 |
|------|------|
| パス | `/api/cron/youtube-sync` |
| スケジュール | `0 1 * * *`（UTC 01:00 = JST 10:00） |
| 認可 | `Authorization: Bearer $CRON_SECRET` |
| 手動ボタン | Pane 3 / Pane 4 に残してある（予備） |

### 設定

1. Vercel → **Settings → Environment Variables** に `CRON_SECRET`（ランダムな長い文字列）
2. `vercel.json` の crons 付きで **Redeploy**
3. **Settings → Cron Jobs** にジョブが表示されることを確認

手動実行:

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "https://workspace-ui-kit-lyart.vercel.app/api/cron/youtube-sync" | python3 -m json.tool
```

---

## うまくいかないとき

| 症状 | 対処 |
|------|------|
| `YouTube OAuth 未設定` | Vercel Environment Variables に 3項目を設定して Redeploy |
| `トークンの更新に失敗` / `invalid_grant` | **ほぼ Testing の7日失効**。Consent を **In production** にしてから Playground で再取得 → Vercel 更新 |
| refresh_token が空 | Playground ⚙ の Force prompt → **Consent screen** で再認可 |
| `redirect_uri_mismatch` | OAuth クライアントに Playground の URI を追加（Step 3b） |
| 403 / OAuth エラー | テストユーザーに自分を追加、スコープ確認 |
| IMP/CTR だけ 0 件 | **Reporting API** 有効化、reach ジョブ生成待ち |
| Cron が 401 / 503 | `CRON_SECRET` 未設定または Bearer 不一致。Vercel Cron Jobs と env を確認 |

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
