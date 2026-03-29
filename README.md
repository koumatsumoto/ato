# ATO

あとでやることを残すメモアプリ。GitHub Issues をバックエンドに使用。

## アーキテクチャ

| パッケージ | 説明         | デプロイ先   |
| ---------- | ------------ | ------------ |
| `apps/spa` | React 19 SPA | GitHub Pages |

## 必要環境

- Node.js >= 24.13.0
- pnpm >= 10.0.0

## セットアップ

```bash
git clone <repo-url> && cd ato
pnpm install
```

認証基盤は公開リポジトリ [`gh-auth-bridge`](https://github.com/koumatsumoto/gh-auth-bridge) の Cloudflare Worker を利用する。

## 開発コマンド

```bash
pnpm dev              # SPA のみ (http://localhost:5173)

pnpm dev:spa          # SPA のみ (http://localhost:5173)

pnpm typecheck        # TypeScript 型チェック
pnpm lint             # Lint
pnpm test             # テスト
pnpm build            # ビルド
pnpm format           # フォーマット
```

## プロジェクト構成

```text
ato/
  apps/
    spa/              # React 19 SPA (Vite 6 + TailwindCSS 4)
  docs/
    specs/            # 設計仕様書
```
