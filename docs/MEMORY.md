# このツールの「記憶」 — 何をどこに保存するか

セミナー課題「自分のツールに記憶を持たせる」の整理メモ。

## 1段落で言うと

このツールの「記憶」は3段階ある。Git の JSON と SKILL は配布用の初期値と AI への指示。ユーザーが変える企画・予定は Supabase に自動保存し、2人で共有する。レイアウトの幅だけはブラウザの localStorage に置き、DB には載せない。Supabase を設定しない開発環境では、編集は画面のあいだだけ有効で、リロードすると JSON の seed に戻る。

## 3層の対応表

| 置き場 | 中身 | 誰のため | リロード後 |
|--------|------|----------|------------|
| **リポジトリ** (`data/*.json`, `CLAUDE.md`, `.claude/skills/`) | 初期デモデータ、AI 向け開発ルール | 開発者・初回起動 | 常に同じ（UI 編集は書き戻されない） |
| **Supabase** (`workspace_state.data`) | チャンネル・企画・撮影予定・YouTube 分析 | 利用者（2名共有） | 残る（クラウド同期 ON 時） |
| **localStorage** (`workspace-ui-kit:pane-widths`) | 4ペインの幅 | そのブラウザだけ | 幅だけ残る |

## 記憶しないもの（あえて保存しない）

- 選択中の行、ダイアログの開閉 → React state のみ
- URL メタデータ → 都度 API で取得
- YouTube OAuth トークン → 環境変数

## AI ツールの記憶（アプリの DB とは別）

Cursor / Claude が参照する `CLAUDE.md` や `.claude/skills/` は、**開発者向けの静的テキスト**。アプリ利用者が Supabase に保存した企画データは、自動では AI に学習されない。AI の「記憶」= リポジトリに書いた指示を毎回読む、という仕組み。

## デモで確認する3パターン

1. **記憶あり（本番）** — ログイン → 企画を編集 → リロード → 変更が残る（Supabase）
2. **記憶なし（ローカル）** — Supabase 未設定で `npm run dev` → 編集 → リロード → `data/*.json` の初期値に戻る
3. **記憶の種類が違う** — ペイン幅を変える → リロード → 幅だけ残る（localStorage）。企画データはパターン1か2次第

## 検証結果（2026-06-18）

| パターン | 確認方法 | 結果 |
|----------|----------|------|
| 1. 本番で記憶あり | 本番 URL の API・提出用スクショ（「クラウド同期 ON」表示） | 本番は Supabase 有効。パスワード保護は `WORKSPACE_ACCESS_PASSWORD` 設定時のみ |
| 2. ローカルで記憶なし | `isWorkspaceSyncEnabled()` が env 未設定で `false` | `__tests__/memory-patterns.test.ts` で合格 |
| 3. ペイン幅だけ localStorage | キー `workspace-ui-kit:pane-widths` の保存・復元 | 同上テストで合格。企画データ用の localStorage キーは存在しない |

```bash
npm run test -- __tests__/memory-patterns.test.ts
```

## 関連ファイル

- 同期: [`hooks/useWorkspaceSync.ts`](../hooks/useWorkspaceSync.ts)
- Supabase: [`lib/supabase/workspace-store.ts`](../lib/supabase/workspace-store.ts)
- ペイン幅: [`hooks/useWorkspacePaneWidths.ts`](../hooks/useWorkspacePaneWidths.ts)
- 2人共有手順: [`SHARING-2-USERS.md`](SHARING-2-USERS.md)
