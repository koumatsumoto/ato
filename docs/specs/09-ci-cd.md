# 09. CI/CD・デプロイ

## 概要

GitHub Actions で CI (lint / typecheck / test) と CD (SPA -> GitHub Pages, BFF -> Deno Deploy) を自動化する。

---

## 1. ワークフロー一覧

| ワークフロー     | トリガー                                              | 内容                              |
| ---------------- | ----------------------------------------------------- | --------------------------------- |
| `ci.yml`         | PR / push to main                                     | lint, typecheck, test (SPA + BFF) |
| `deploy-spa.yml` | push to main (packages/spa or packages/shared 変更時) | Vite build -> GitHub Pages        |
| `deploy-bff.yml` | push to main (packages/bff or packages/shared 変更時) | deployctl -> Deno Deploy          |

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

  test-bff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: denoland/setup-deno@v2
        with:
          deno-version: v2.x

      - name: Check
        run: deno task check
        working-directory: packages/bff

      - name: Lint
        run: deno task lint
        working-directory: packages/bff

      - name: Format check
        run: deno fmt --check
        working-directory: packages/bff

      - name: Run tests
        run: deno task test
        working-directory: packages/bff
```

---

## 3. SPA デプロイ

### .github/workflows/deploy-spa.yml

```yaml
name: Deploy SPA

on:
  push:
    branches: [main]
    paths:
      - packages/spa/**
      - packages/shared/**
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
          VITE_BFF_URL: ${{ vars.BFF_URL }}

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: packages/spa/dist

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

## 4. BFF デプロイ

### .github/workflows/deploy-bff.yml

```yaml
name: Deploy BFF

on:
  push:
    branches: [main]
    paths:
      - packages/bff/**
      - packages/shared/**
      - .github/workflows/deploy-bff.yml

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      - uses: denoland/setup-deno@v2
        with:
          deno-version: v2.x

      - name: Deploy to Deno Deploy
        uses: denoland/deployctl@v1
        with:
          project: ato-bff
          entrypoint: packages/bff/src/main.ts
          root: .
```

### Deno Deploy 設定

| 項目             | 値                               |
| ---------------- | -------------------------------- |
| プロジェクト名   | `ato-bff`                        |
| エントリポイント | `packages/bff/src/main.ts`       |
| 環境変数         | Deno Deploy ダッシュボードで設定 |
| KV               | 自動 (Deno Deploy 組み込み)      |

---

## 5. 環境変数一覧

### 5.1 GitHub Actions (Repository Variables / Secrets)

| 名前      | 種別     | 用途                   |
| --------- | -------- | ---------------------- |
| `BFF_URL` | Variable | SPA ビルド時の BFF URL |

### 5.2 Deno Deploy (Environment Variables)

| 名前                   | 用途                          | 例                         |
| ---------------------- | ----------------------------- | -------------------------- |
| `GITHUB_CLIENT_ID`     | OAuth App Client ID           | `Iv1.abc123...`            |
| `GITHUB_CLIENT_SECRET` | OAuth App Client Secret       | `secret_...`               |
| `SPA_ORIGIN`           | CORS 許可オリジン             | `https://user.github.io`   |
| `BFF_ORIGIN`           | BFF 自身のオリジン            | `https://ato-bff.deno.dev` |
| `DATASTORE_REPO_NAME`  | リポジトリ名 (optional)       | `ato-datastore`            |
| `SESSION_TTL_HOURS`    | セッション有効期間 (optional) | `24`                       |

---

## 6. GitHub OAuth App 設定

GitHub Settings > Developer settings > OAuth Apps で作成。

| 項目                       | 開発                                  | 本番                                     |
| -------------------------- | ------------------------------------- | ---------------------------------------- |
| Application name           | ATO (dev)                             | ATO                                      |
| Homepage URL               | `http://localhost:5173`               | `https://user.github.io/ato`             |
| Authorization callback URL | `http://localhost:8000/auth/callback` | `https://ato-bff.deno.dev/auth/callback` |

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
2. Deno Deploy プロジェクトを作成 (`ato-bff`)
3. GitHub リポジトリの Settings > Pages で Source を "GitHub Actions" に設定

### 8.2 デプロイ

1. Deno Deploy に環境変数を設定 (GITHUB_CLIENT_ID, SECRET, SPA_ORIGIN, BFF_ORIGIN)
2. GitHub Actions の Repository Variables に `BFF_URL` を設定
3. main ブランチに push
4. GitHub Actions が自動で SPA と BFF をデプロイ

### 8.3 確認

1. SPA: `https://user.github.io/ato` にアクセス
2. BFF: `https://ato-bff.deno.dev/auth/me` で 401 が返ること
3. ログインフローが正常に動作すること
