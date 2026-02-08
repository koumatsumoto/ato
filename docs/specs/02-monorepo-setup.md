# 02. モノリポ・開発環境セットアップ

## 概要

`~/projects/monorepo` パターンに準拠した pnpm workspace モノリポ。
SPA と OAuth Proxy の 2 パッケージ構成。OAuth Proxy は pnpm workspace に含め、wrangler で管理する。

---

## 1. ディレクトリ構成

```text
ato/
  .github/
    workflows/
      ci.yml                           # lint, typecheck, test
      deploy-spa.yml                   # Vite build -> GitHub Pages
      deploy-oauth-proxy.yml           # wrangler -> Cloudflare Workers
  .husky/
    pre-commit                         # pnpm exec lint-staged
  .markdownlint.json                   # Markdown lint 設定
  .gitignore                           # Git 除外設定
  package.json                         # @ato/monorepo (root)
  pnpm-workspace.yaml                  # workspace 定義
  tsconfig.json                        # root TypeScript 設定
  README.md
  docs/
    specs/                             # 設計ドキュメント (本ディレクトリ)
  apps/
    spa/                               # React SPA
      public/
        404.html                       # GitHub Pages SPA fallback
        favicon.svg
      src/
        main.tsx
        globals.css
        app/
          App.tsx
          router.tsx
          providers.tsx
        features/
          auth/
            components/
            hooks/
            lib/
              token-store.ts           # getToken, setToken, clearToken
            __tests__/
          todos/
            components/
            hooks/
            lib/
              github-api.ts            # Todo CRUD (GitHub API 直接呼び出し)
              github-client.ts         # githubFetch ベースクライアント
              issue-mapper.ts          # GitHubIssue -> Todo 変換
              pagination.ts            # Link ヘッダー解析
              repo-init.ts             # リポジトリ自動作成
            __tests__/
        shared/
          components/
            layout/
            ui/
          lib/
          __tests__/
            setup.ts
        types/
          todo.ts                      # Todo, CreateTodoInput, UpdateTodoInput
          github.ts                    # GitHubIssue, GitHubUser, GitHubRepository
          auth.ts                      # AuthUser
          errors.ts                    # AuthError, GitHubApiError, NetworkError 等
      index.html
      vite.config.ts
      vitest.config.ts
      eslint.config.mjs
      tsconfig.json
      package.json                     # @ato/spa
    oauth-proxy/                       # OAuth Proxy (Cloudflare Workers)
      src/
        index.ts                       # Worker エントリポイント (~50 行)
      wrangler.toml                    # Cloudflare Workers 設定
      .dev.vars                        # ローカル開発用環境変数 (.gitignore 対象)
      .dev.vars.example                # 環境変数テンプレート
      tsconfig.json
      package.json                     # @ato/oauth-proxy
```

---

## 2. Root 設定ファイル

### 2.1 package.json

```json
{
  "name": "@ato/monorepo",
  "version": "0.1.0",
  "private": true,
  "description": "ATO - Simple TODO app backed by GitHub Issues",
  "scripts": {
    "dev": "pnpm --filter @ato/spa dev",
    "dev:proxy": "pnpm --filter @ato/oauth-proxy dev",
    "build": "pnpm --filter @ato/spa build",
    "test": "pnpm --filter @ato/spa test",
    "lint": "pnpm --filter @ato/spa lint",
    "format": "prettier --write \"**/*.{ts,tsx,json}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,json}\"",
    "lint:md": "markdownlint \"**/*.md\" --ignore node_modules",
    "typecheck": "pnpm --filter @ato/spa typecheck",
    "prepare": "husky"
  },
  "lint-staged": {
    "apps/spa/**/*.{ts,tsx}": ["pnpm --filter @ato/spa exec eslint --fix", "prettier --write"],
    "apps/oauth-proxy/**/*.ts": ["prettier --write"],
    "*.json": ["prettier --write"],
    "*.md": ["prettier --write", "markdownlint --fix"]
  },
  "prettier": {
    "printWidth": 150
  },
  "devDependencies": {
    "husky": "^9",
    "lint-staged": "^16",
    "markdownlint-cli": "^0.43",
    "prettier": "^3",
    "typescript": "^5"
  },
  "engines": {
    "node": ">=22.0.0",
    "pnpm": ">=10.0.0"
  },
  "packageManager": "pnpm@10.4.1"
}
```

### 2.2 pnpm-workspace.yaml

```yaml
packages:
  - apps/spa
  - apps/oauth-proxy
```

### 2.3 tsconfig.json (root)

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": false,
    "jsx": "react-jsx",
    "declaration": true,
    "sourceMap": true,

    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,

    "allowUnusedLabels": false,
    "allowUnreachableCode": false,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noPropertyAccessFromIndexSignature": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,

    "isolatedModules": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "incremental": true
  },
  "exclude": ["node_modules", "dist", "build"]
}
```

### 2.4 .markdownlint.json

```json
{
  "default": true,
  "MD013": {
    "line_length": 200
  },
  "MD024": false,
  "MD033": false,
  "MD036": false,
  "MD041": false
}
```

### 2.5 .husky/pre-commit

```bash
pnpm exec lint-staged
```

---

## 3. apps/spa

### 3.1 package.json

```json
{
  "name": "@ato/spa",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@tanstack/react-query": "^5",
    "react": "^19",
    "react-dom": "^19",
    "react-router": "^7",
    "zod": "^3"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6",
    "@testing-library/react": "^16",
    "@testing-library/user-event": "^14",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@tailwindcss/vite": "^4",
    "@vitejs/plugin-react": "^4",
    "eslint": "^9",
    "eslint-plugin-react-hooks": "^5",
    "eslint-plugin-react-refresh": "^0.4",
    "jsdom": "^26",
    "msw": "^2",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vite": "^6",
    "vitest": "^4",
    "@vitest/coverage-v8": "^4"
  }
}
```

`@ato/shared` への依存は不要。型定義は `apps/spa/src/types/` に直接配置する。

### 3.2 tsconfig.json

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "tsBuildInfoFile": "./dist/.tsbuildinfo",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 3.3 vite.config.ts

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // OAuth Proxy (wrangler dev) へ転送
      "/auth": "http://localhost:8787",
    },
  },
  build: {
    outDir: "dist",
  },
});
```

開発時は Vite proxy で `/auth` リクエストを OAuth Proxy (wrangler dev) に転送する。
SPA は GitHub API (`https://api.github.com`) を直接呼び出すため、`/todos` 等のプロキシは不要。

### 3.4 vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/shared/__tests__/setup.ts"],
    include: ["src/features/**/__tests__/**/*.test.{ts,tsx}", "src/shared/__tests__/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/__tests__/**", "src/main.tsx"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### 3.5 eslint.config.mjs

```javascript
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["**/node_modules", "**/dist", "**/*.config.ts", "**/*.config.mjs"]),
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
]);
```

### 3.6 globals.css

```css
@import "tailwindcss";
```

### 3.7 環境変数

```text
# apps/spa/.env (開発用)
VITE_OAUTH_PROXY_URL=http://localhost:8787
```

SPA が参照する環境変数は `VITE_OAUTH_PROXY_URL` のみ。
GitHub API の URL (`https://api.github.com`) はコード内定数とする。

---

## 4. apps/oauth-proxy

### 4.1 package.json

```json
{
  "name": "@ato/oauth-proxy",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "wrangler": "^4",
    "@cloudflare/workers-types": "^4",
    "typescript": "^5"
  }
}
```

依存は wrangler と型定義のみ。フレームワークは使用しない。

### 4.2 wrangler.toml

```toml
name = "ato-oauth"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[vars]
SPA_ORIGIN = "https://{user}.github.io"
```

`GITHUB_CLIENT_ID` と `GITHUB_CLIENT_SECRET` は `wrangler secret put` コマンドで設定する (wrangler.toml には含めない)。

### 4.3 .dev.vars.example

```text
GITHUB_CLIENT_ID=your_oauth_client_id
GITHUB_CLIENT_SECRET=your_oauth_client_secret
SPA_ORIGIN=http://localhost:5173
```

ローカル開発時は `.dev.vars` にコピーして値を設定する。`.dev.vars` は `.gitignore` 対象。

### 4.4 tsconfig.json

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["@cloudflare/workers-types"],
    "jsx": "react-jsx",
    "lib": ["ES2023"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

`DOM` ライブラリは不要 (Workers 環境)。`@cloudflare/workers-types` で Workers API の型を提供。

---

## 5. 開発ワークフロー

### 5.1 初期セットアップ

```bash
# リポジトリクローン
git clone <repo-url> && cd ato

# パッケージインストール
pnpm install

# OAuth Proxy 環境変数
cp apps/oauth-proxy/.dev.vars.example apps/oauth-proxy/.dev.vars
# .dev.vars を編集: GitHub OAuth App の設定値を入力
```

### 5.2 開発サーバー起動

ターミナル 1: OAuth Proxy

```bash
pnpm dev:proxy
# -> http://localhost:8787 で起動
```

ターミナル 2: SPA

```bash
pnpm dev
# -> http://localhost:5173 で起動
# /auth/* は Vite proxy 経由で OAuth Proxy に転送
```

SPA (localhost:5173) -> OAuth Proxy (localhost:8787) は Vite proxy で `/auth` を接続。
SPA -> GitHub API (`https://api.github.com`) は直接通信 (CORS サポート)。

### 5.3 テスト

```bash
# SPA テスト
pnpm test

# SPA カバレッジ
pnpm --filter @ato/spa test:coverage
```

OAuth Proxy はロジックが極めて少ない (~50 行) ため、手動テストで十分。
必要に応じて将来テストを追加する。

### 5.4 ビルド

```bash
# SPA ビルド (GitHub Pages 用)
pnpm build
# -> apps/spa/dist/

# OAuth Proxy デプロイ
pnpm --filter @ato/oauth-proxy deploy
# -> wrangler deploy で Cloudflare Workers にデプロイ
```

---

## 6. ブラウザ互換性

対象ブラウザ: 最新主要ブラウザの現行バージョン。

| ブラウザ | 最低バージョン    |
| -------- | ----------------- |
| Chrome   | 最新 2 バージョン |
| Edge     | 最新 2 バージョン |
| Firefox  | 最新 2 バージョン |
| Safari   | 最新 2 バージョン |

Vite の `build.target` はデフォルト (`esnext`) を使用。
TypeScript の `target: ES2023` で主要ブラウザはすべてカバーされる。

---

## 7. .gitignore

```text
# Dependencies
node_modules/
.pnpm-store/

# Build
dist/
build/

# Environment
.env
.env.local
.env.*.local
.dev.vars

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Coverage
coverage/

# TypeScript
*.tsbuildinfo

# Logs
*.log

# Cloudflare Workers
.wrangler/
```
