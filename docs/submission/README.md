# スクール提出用図解（surge.sh）

[参考例（採用管理ツール）](https://ads-personal-workspace-example.surge.sh/) と同じ4セクション構成の静的ページです。

提出用の文案は [`index.html`](index.html) に反映済みです。追記・修正する場合は [`WRITING.md`](WRITING.md) を参照してください。

## ローカルで確認

`index.html` をブラウザで開くか、簡易サーバーで:

```bash
cd docs/submission
python3 -m http.server 8765
# http://localhost:8765
```

## スクリーンショットを差し替える

1. 本番を開く: `https://workspace-ui-kit-lyart.vercel.app/`（パスワード保護を有効にしている場合は `/login` から）
2. 4ペインがすべて見える状態で画面キャプチャ
3. 次のパスに保存（PNG 推奨）:

```text
docs/submission/assets/screenshot.png
```

- 共有パスワード・個人情報が写らないよう注意
- 未配置のときは `assets/screenshot.svg`（プレースホルダ）が表示されます

## surge.sh に公開

初回のみメール認証があります。

```bash
cd /Users/ma-chingroup/src/workspace-ui-kit
npm run deploy:diagram
# または: npx surge docs/submission
```

ドメイン: `workspace-ui-kit-diagram.surge.sh`（`docs/submission/CNAME` に記載）

```bash
npx surge docs/submission   # CNAME があるのでドメイン指定不要
```

## ポータル提出

| 項目 | URL |
|------|-----|
| 図解（このページ） | https://workspace-ui-kit-diagram.surge.sh |
| 本番アプリ（任意） | `https://workspace-ui-kit-lyart.vercel.app` |

本番は Vercel の `WORKSPACE_ACCESS_PASSWORD` 設定次第（未設定ならログイン不要）。図解ページは常にログイン不要です。
