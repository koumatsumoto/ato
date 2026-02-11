# ATO

日々の跡を残すメモアプリ。GitHub Issues をバックエンドに使用。

## アーキテクチャ

| パッケージ         | 説明               | デプロイ先         |
| ------------------ | ------------------ | ------------------ |
| `apps/spa`         | React 19 SPA       | GitHub Pages       |
| `apps/oauth-proxy` | GitHub OAuth Proxy | Cloudflare Workers |

## 必要環境

- Node.js >= 22.0.0
- pnpm >= 10.0.0

## セットアップ

```bash
git clone <repo-url> && cd ato
pnpm install
cp apps/oauth-proxy/.dev.vars.example apps/oauth-proxy/.dev.vars
# .dev.vars を編集: GitHub OAuth App の設定値を入力
```

## 開発コマンド

```bash
pnpm dev              # SPA + OAuth Proxy を同時起動

pnpm dev:spa          # SPA のみ (http://localhost:5173)
pnpm dev:proxy        # OAuth Proxy のみ (http://localhost:8787)

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
    oauth-proxy/      # Cloudflare Workers OAuth Proxy
  docs/
    specs/            # 設計仕様書
```
