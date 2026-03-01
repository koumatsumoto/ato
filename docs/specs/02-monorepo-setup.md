# 02. モノリポ・開発環境セットアップ

## 概要

ATO は pnpm workspace で構成されたモノリポで、以下の 2 パッケージを持つ。

- `apps/spa`: React SPA
- `apps/oauth-proxy`: Cloudflare Workers ベースの OAuth Proxy

---

## 1. ディレクトリ構成

```text
ato/
  .github/
    workflows/
      ci.yml
      deploy-spa.yml
      deploy-oauth-proxy.yml
  apps/
    spa/
      public/
      src/
        app/
          pages/
          App.tsx
          providers.tsx
          router.tsx
        features/
          actions/
          auth/
        shared/
      index.html
      vite.config.ts
      vitest.config.ts
      package.json
    oauth-proxy/
      src/
        index.ts
        __tests__/index.test.ts
      wrangler.toml
      .dev.vars.example
      package.json
  docs/
    guides/
    specs/
  package.json
  pnpm-workspace.yaml
  tsconfig.json
```

---

## 2. Root 設定

### 2.1 `package.json`

現行の root scripts は以下。

```json
{
  "scripts": {
    "dev": "concurrently -n spa,proxy -c blue,green \"pnpm dev:spa\" \"pnpm dev:proxy\"",
    "dev:spa": "pnpm --filter @ato/spa dev",
    "dev:proxy": "pnpm --filter @ato/oauth-proxy dev",
    "build": "pnpm --filter @ato/spa build",
    "test": "pnpm --filter @ato/spa test && pnpm --filter @ato/oauth-proxy test",
    "lint": "pnpm --filter @ato/spa lint",
    "typecheck": "pnpm --filter @ato/spa typecheck && pnpm --filter @ato/oauth-proxy typecheck",
    "format": "prettier --write \"**/*.{ts,tsx,json}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,json}\"",
    "lint:md": "markdownlint \"**/*.md\" --ignore node_modules"
  },
  "engines": {
    "node": ">=24.13.0",
    "pnpm": ">=10.0.0"
  },
  "packageManager": "pnpm@10.4.1"
}
```

### 2.2 `pnpm-workspace.yaml`

```yaml
packages:
  - apps/spa
  - apps/oauth-proxy
```

---

## 3. SPA パッケージ設定

### 3.1 `apps/spa/vite.config.ts`

- `base: "/ato/"` (GitHub Pages 配備パス)
- `server.proxy["/auth"] = "http://localhost:8787"`
- PWA 設定あり (`vite-plugin-pwa`)

### 3.2 `apps/spa/public/404.html`

GitHub Pages の SPA fallback 用。404 到達時に `/ato/?redirect=...` へリダイレクトする。

### 3.3 環境変数

`apps/spa/.env`:

```ini
VITE_OAUTH_PROXY_URL=http://localhost:8787
```

---

## 4. OAuth Proxy パッケージ設定

### 4.1 `apps/oauth-proxy/wrangler.toml`

```toml
name = "ato-oauth"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[vars]
SPA_ORIGIN = "https://koumatsumoto.github.io"
```

### 4.2 ローカル環境変数

`apps/oauth-proxy/.dev.vars` (テンプレートは `.dev.vars.example`):

```ini
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
SPA_ORIGIN=http://localhost:5173
```

---

## 5. 開発ワークフロー

### 5.1 初期セットアップ

```bash
git clone <repo-url> && cd ato
pnpm install
cp apps/oauth-proxy/.dev.vars.example apps/oauth-proxy/.dev.vars
echo 'VITE_OAUTH_PROXY_URL=http://localhost:8787' > apps/spa/.env
```

### 5.2 開発サーバー

```bash
# root で同時起動
pnpm dev

# 個別起動
pnpm dev:spa
pnpm dev:proxy
```

### 5.3 テスト

```bash
# 全テスト
pnpm test

# SPA
pnpm --filter @ato/spa test:coverage

# OAuth Proxy
pnpm --filter @ato/oauth-proxy test:coverage
```

---

## 6. CI/CD との整合

### 6.1 CI (`.github/workflows/ci.yml`)

- `lint-and-typecheck`
- `test-spa`
- `test-oauth-proxy`

### 6.2 Deploy

- `deploy-spa.yml`: `workflow_run` (CI success) で Pages deploy
- `deploy-oauth-proxy.yml`: `workflow_run` (CI success) で Workers deploy

### 6.3 Node バージョン方針

- 実行要件: `>=24.13.0`
- Actions: `node-version: "24"`

---

## 7. 補足

- ドメイン用語は Todo ではなく Action を採用する
- `ato-datastore` リポジトリは自動作成しない。存在しない場合は UI にセットアップガイドを表示する
- 実装仕様の詳細は `03-09` を参照
