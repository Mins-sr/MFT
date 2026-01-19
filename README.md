# MFT - My Favorite Things

⚡ お気に入りサイトの更新を追跡するRSSライクなフィードリーダー

## 機能

- 🔗 **URL追加**: 好きなウェブサイトを登録
- 🔄 **自動巡回**: GitHub Actionsで1時間ごとにチェック
- 📊 **差分検出**: 更新があったコンテンツの変更箇所を記録
- 🏷️ **タグ付け**: 興味のある分野でカテゴライズ
- 🎯 **フィルタリング**: タグで表示を絞り込み

## 使い方

### 1. フォーク

このリポジトリをフォークしてください。

### 2. GitHub Pagesを有効化

1. Settings → Pages
2. Source: **GitHub Actions** を選択

### 3. ワークフロー権限を確認

1. Settings → Actions → General
2. Workflow permissions: **Read and write permissions** を選択

### 4. URLを追加

`data/feeds.json` を編集して、監視したいURLを追加します:

```json
{
  "feeds": [
    {
      "id": "unique-id",
      "url": "https://example.com",
      "title": "サイト名",
      "tags": ["技術", "ニュース"],
      "selector": "article",
      "addedAt": "2026-01-19T00:00:00+09:00",
      "lastChecked": null,
      "lastUpdated": null
    }
  ],
  "tags": ["技術", "ニュース", "ブログ"]
}
```

### パラメータ説明

| パラメータ | 説明 |
|-----------|------|
| `id` | 一意のID（英数字とハイフン） |
| `url` | 監視するURL |
| `title` | 表示名 |
| `tags` | 分類タグ（配列） |
| `selector` | 監視対象のCSSセレクタ（デフォルト: `body`） |

## 技術スタック

- **フロントエンド**: HTML, CSS, JavaScript（静的サイト）
- **バックエンド**: Node.js スクリプト（GitHub Actionsで実行）
- **ホスティング**: GitHub Pages
- **自動化**: GitHub Actions（1時間ごとのcron）

## ローカル開発

```bash
# 依存関係インストール
npm install

# 手動巡回
npm run crawl

# ビルド
npm run build
```

## ディレクトリ構造

```
MFT/
├── .github/
│   └── workflows/
│       └── crawl.yml     # 自動巡回ワークフロー
├── data/
│   ├── feeds.json        # 登録フィード
│   ├── history.json      # 更新履歴
│   └── snapshots/        # コンテンツスナップショット
├── docs/                  # GitHub Pages用（ビルド出力）
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── feeds.json
│   └── history.json
├── scripts/
│   ├── crawler.js        # 巡回スクリプト
│   └── build.js          # ビルドスクリプト
└── package.json
```

## ライセンス

MIT License
