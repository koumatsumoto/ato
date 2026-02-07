# 09. CI/CD・デプロイ

## 概要

GitHub Actions で CI (lint / typecheck / test) と CD (SPA -> GitHub Pages, OAuth Proxy -> Cloudflare Workers) を自動化する。

---

## 1. ワークフロー一覧

| ワークフロー             | トリガー                               | 内容                                  |
| ------------------------ | -------------------------------------- | ------------------------------------- |
| `ci.yml`                 | PR / push to main                      | lint, typecheck, test (SPA)           |
| `deploy-spa.yml`         | push to main (apps/spa 変更時)         | Vite build -> GitHub Pages            |
| `deploy-oauth-proxy.yml` | push to main (apps/oauth-proxy 変更時) | wrangler deploy -> Cloudflare Workers |

---

## 2. CI ワークフロー

### .github/workflows/ci.yml

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Format check
        run: pnpm format:check

      - name: Markdown lint
        run: pnpm lint:md

      - name: ESLint
        run: pnpm lint

      - name: TypeScript check
        run: pnpm typecheck

  test-spa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test

      - name: Coverage check
        run: pnpm --filter @ato/spa test:coverage
```

OAuth Proxy は ~50 行の薄い実装のため、CI でのテストジョブは不要。
SPA のテストのみで十分なカバレッジを確保する。

---

## 3. SPA デプロイ

### .github/workflows/deploy-spa.yml

```yaml
name: Deploy SPA

on:
  push:
    branches: [main]
    paths:
      - apps/spa/**
      - .github/workflows/deploy-spa.yml

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build
        env:
          VITE_OAUTH_PROXY_URL: ${{ vars.OAUTH_PROXY_URL }}

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: apps/spa/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Vite ビルド設定

```typescript
// vite.config.ts の build セクション
build: {
  outDir: "dist",
  // GitHub Pages のベースパス (リポジトリ名)
  // base: "/ato/" は package.json の homepage や vite.config で設定
}
```

GitHub Pages の設定:

- Source: GitHub Actions
- ブランチ: なし (Actions からデプロイ)

---

## 4. OAuth Proxy デプロイ

### .github/workflows/deploy-oauth-proxy.yml

```yaml
name: Deploy OAuth Proxy

on:
  push:
    branches: [main]
    paths:
      - apps/oauth-proxy/**
      - .github/workflows/deploy-oauth-proxy.yml

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: apps/oauth-proxy
```

### Cloudflare Workers 設定

| 項目             | 値                                                        |
| ---------------- | --------------------------------------------------------- |
| プロジェクト名   | `ato-oauth`                                               |
| エントリポイント | `apps/oauth-proxy/src/index.ts`                           |
| Secrets          | Cloudflare ダッシュボード or `wrangler secret put` で設定 |

---

## 5. 環境変数一覧

### 5.1 GitHub Actions (Repository Variables / Secrets)

| 名前                   | 種別     | 用途                                       |
| ---------------------- | -------- | ------------------------------------------ |
| `OAUTH_PROXY_URL`      | Variable | SPA ビルド時の OAuth Proxy URL             |
| `CLOUDFLARE_API_TOKEN` | Secret   | Cloudflare Workers デプロイ用 API トークン |

### 5.2 Cloudflare Workers (Secrets / Variables)

| 名前                   | 種別     | 用途                    | 例                         |
| ---------------------- | -------- | ----------------------- | -------------------------- |
| `GITHUB_CLIENT_ID`     | Secret   | OAuth App Client ID     | `Iv1.abc123...`            |
| `GITHUB_CLIENT_SECRET` | Secret   | OAuth App Client Secret | `secret_...`               |
| `SPA_ORIGIN`           | Variable | CORS 許可 + postMessage | `https://{user}.github.io` |

設定方法:

```bash
# Secrets は wrangler CLI で設定
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET

# Variables は wrangler.toml の [vars] で設定
# SPA_ORIGIN = "https://{user}.github.io"
```

---

## 6. GitHub OAuth App 設定

GitHub Settings > Developer settings > OAuth Apps で作成。

| 項目                       | 開発                                  | 本番                                                 |
| -------------------------- | ------------------------------------- | ---------------------------------------------------- |
| Application name           | ATO (dev)                             | ATO                                                  |
| Homepage URL               | `http://localhost:5173`               | `https://{user}.github.io/ato`                       |
| Authorization callback URL | `http://localhost:8787/auth/callback` | `https://ato-oauth.{user}.workers.dev/auth/callback` |

開発用と本番用で別の OAuth App を作成する。

---

## 7. ブランチ戦略

| ブランチ | 用途                                             |
| -------- | ------------------------------------------------ |
| `main`   | 本番デプロイ対象。直接 push 禁止 (PR マージのみ) |
| `feat/*` | 機能ブランチ                                     |
| `fix/*`  | バグ修正ブランチ                                 |

### PR マージ条件

- CI 全ジョブが pass
- 1 人以上のレビュー承認 (将来的に)

---

## 8. 初回デプロイ手順

### 8.1 事前準備

1. GitHub OAuth App を作成 (開発用 + 本番用)
2. Cloudflare アカウントで API トークンを作成 (Workers 編集権限)
3. GitHub リポジトリの Settings > Pages で Source を "GitHub Actions" に設定

### 8.2 Cloudflare Workers セットアップ

```bash
# 初回デプロイ (プロジェクト自動作成)
cd apps/oauth-proxy
npx wrangler deploy

# Secrets 設定
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```

### 8.3 GitHub Actions 設定

1. Repository Secrets に `CLOUDFLARE_API_TOKEN` を設定
2. Repository Variables に `OAUTH_PROXY_URL` を設定 (例: `https://ato-oauth.{user}.workers.dev`)
3. main ブランチに push

### 8.4 確認

1. SPA: `https://{user}.github.io/ato` にアクセス
2. OAuth Proxy: `https://ato-oauth.{user}.workers.dev/auth/login` でGitHub OAuth ページにリダイレクトされること
3. ログインフローが正常に動作すること
