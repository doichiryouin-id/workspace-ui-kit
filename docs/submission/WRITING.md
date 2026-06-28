# 図解の文言を自分で書くとき

画面の**構成・CSS・ブロックの種類**は [運営の見本](https://ads-personal-workspace-example.surge.sh/) に合わせてあります。  
**文章だけ** [`index.html`](index.html) を編集してください。

## 編集ファイル

| ファイル | 触る？ |
|----------|--------|
| `index.html` | **文言を書く** |
| `styles.css` | 基本触らない（色や余白はここ） |
| `assets/screenshot.png` | 済みならそのまま |

## 見本との対応表

| 見本 | あなたの `index.html` |
|------|------------------------|
| タイトル + キャッチ | `<h1 class="site-title">` |
| リード文 | `<p class="lead">`（黄色い枠を外してOK） |
| 目次 4項目 | `.toc`（サブタイトルは `.toc-hint`） |
| SECTION 1 キャプチャ + 4ペイン説明 | `#section-1` |
| SECTION 2 callout + 3カード + 割当表 | `#section-2` |
| SECTION 3 工夫①〜④ + 効果 | `#section-3` の `.point-block` |
| SECTION 4 苦戦①〜③ + 結論 | `#section-4` の `.point-block` |

## 黄色い枠（`.placeholder`）について

下書き用の目印です。文章を書き終えたら:

1. `class="placeholder"` を削除する  
2. または `placeholder` の class だけ外して、普通の `<p>` にする  

印刷・提出時に黄色枠が残っていても動作はしますが、見た目は消した方がきれいです。

## 書くときのヒント（見本の型）

### SECTION 2「解決する課題」

- **3つ**「同時に知りたいこと」を書く（見本は採用の「全体・人物・面接」）
- 動画企画なら例: 全体の予定 / 1本の中身 / 公開後の数字 など

### SECTION 3「工夫したポイント」

見本は **4項目**。各項目に:

1. 見出し（何をしたか）  
2. 説明（2〜4文）  
3. 任意: 図・比較（`compare` / `pane-flow`）  
4. **効果:** で1文  

### SECTION 4「苦戦したポイント」

見本は **3項目**。各項目に:

1. 何で迷ったか  
2. **結論:** でどう決めたか  

デプロイ・Supabase の話は書いても書かなくてもOK（あなたの体験に合わせる）。

## 確認

```bash
open docs/submission/index.html
```

問題なければ:

```bash
npm run deploy:diagram
```

## 参考リンク

- 見本: https://ads-personal-workspace-example.surge.sh/
- 本番アプリ: https://workspace-ui-kit-lyart.vercel.app
