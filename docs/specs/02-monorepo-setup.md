# 02. モノリポ・開発環境セットアップ

## 概要

`~/projects/monorepo` パターンに準拠した pnpm workspace モノリポ。
SPA と共有パッケージは pnpm 管理、BFF は Deno 管理 (pnpm workspace 外)。

---

## 1. ディレクトリ構成

```
ato/
  .github/
    workflows/
      ci.yml                           # lint, typecheck, test
      deploy-spa.yml                   # Vite build -> GitHub Pages
      deploy-bff.yml                   # deployctl -> Deno Deploy
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
  packages/
    shared/                            # 共有型定義
      src/
        types/
          todo.ts                      # Todo, CreateTodoInput, UpdateTodoInput
          api.ts                       # ApiResponse, PaginatedResponse, ApiError
          auth.ts                      # AuthUser
          index.ts                     # re-export
      package.json                     # @ato/shared
      tsconfig.json
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
            __tests__/
          todos/
            components/
            hooks/
            lib/
            __tests__/
        shared/
          components/
            layout/
            ui/
          lib/
          __tests__/
            setup.ts
      index.html
      vite.config.ts
      vitest.config.ts
      eslint.config.mjs
      tsconfig.json
      package.json                     # @ato/spa
    bff/                               # Deno BFF (pnpm workspace 外)
      src/
        main.ts
        app.ts
        config.ts
        routes/
          auth.ts
          todos.ts
        middleware/
          auth.ts
          repo-init.ts
          error-handler.ts
        services/
          github-api.ts
          session-store.ts
        lib/
          crypto.ts
          error-mapper.ts
          issue-mapper.ts
          pagination.ts
          validator.ts
        __tests__/
          routes/
          services/
          lib/
      deno.json
      .env.example
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
  "workspaces": ["packages/shared", "packages/spa"],
  "scripts": {
    "dev": "pnpm --filter @ato/spa dev",
    "build": "pnpm --filter @ato/spa build",
    "test": "pnpm --filter @ato/spa test",
    "lint": "pnpm --filter @ato/spa lint",
    "format": "prettier --write \"**/*.{ts,tsx,json}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,json}\"",
    "lint:md": "markdownlint \"**/*.md\" --ignore node_modules --ignore .next",
    "typecheck": "pnpm --filter @ato/spa typecheck",
    "prepare": "husky"
  },
  "lint-staged": {
    "packages/spa/**/*.{ts,tsx}": [
      "pnpm --filter @ato/spa exec eslint --fix",
      "prettier --write"
    ],
    "packages/shared/**/*.{ts,tsx}": ["prettier --write"],
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
  - packages/shared
  - packages/spa
```

BFF は含めない (Deno 管理)。

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

## 3. packages/shared

### 3.1 package.json

```json
{
  "name": "@ato/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./src/types/index.ts",
  "types": "./src/types/index.ts",
  "exports": {
    ".": {
      "types": "./src/types/index.ts",
      "default": "./src/types/index.ts"
    }
  }
}
```

依存なし (型定義のみ)。

### 3.2 tsconfig.json

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 3.3 型定義ファイル

[06-data-model.md](./06-data-model.md) で定義した型を配置。

```
src/types/
  todo.ts    -- Todo, CreateTodoInput, UpdateTodoInput
  api.ts     -- ApiResponse, PaginatedResponse, ApiError, ErrorCode
  auth.ts    -- AuthUser
  index.ts   -- re-export
```

---

## 4. packages/spa

### 4.1 package.json

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
    "@ato/shared": "workspace:*",
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

### 4.2 tsconfig.json

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

### 4.3 vite.config.ts

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
      "/auth": "http://localhost:8000",
      "/todos": "http://localhost:8000",
    },
  },
  build: {
    outDir: "dist",
  },
});
```

### 4.4 vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/shared/__tests__/setup.ts"],
    include: [
      "src/features/**/__tests__/**/*.test.{ts,tsx}",
      "src/shared/__tests__/**/*.test.{ts,tsx}",
    ],
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

### 4.5 eslint.config.mjs

```javascript
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "**/node_modules",
    "**/dist",
    "**/*.config.ts",
    "**/*.config.mjs",
  ]),
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
]);
```

### 4.6 globals.css

```css
@import "tailwindcss";
```

---

## 5. packages/bff

### 5.1 deno.json

```json
{
  "tasks": {
    "dev": "deno run --watch --allow-net --allow-env --allow-read --unstable-kv src/main.ts",
    "start": "deno run --allow-net --allow-env --allow-read --unstable-kv src/main.ts",
    "test": "deno test --allow-net --allow-env --allow-read --unstable-kv src/__tests__/",
    "check": "deno check src/**/*.ts",
    "fmt": "deno fmt",
    "lint": "deno lint"
  },
  "imports": {
    "@hono/hono": "jsr:@hono/hono@^4",
    "@std/assert": "jsr:@std/assert@^1",
    "@ato/shared": "../shared/src/types/index.ts"
  },
  "compilerOptions": {
    "strict": true,
    "lib": ["deno.ns", "deno.unstable"]
  }
}
```

### 5.2 .env.example

```
GITHUB_CLIENT_ID=your_oauth_client_id
GITHUB_CLIENT_SECRET=your_oauth_client_secret
SPA_ORIGIN=http://localhost:5173
BFF_ORIGIN=http://localhost:8000
DATASTORE_REPO_NAME=ato-datastore
SESSION_TTL_HOURS=24
```

---

## 6. 開発ワークフロー

### 6.1 初期セットアップ

```bash
# リポジトリクローン
git clone <repo-url> && cd ato

# Node.js パッケージインストール
pnpm install

# Deno 依存 (キャッシュ)
cd packages/bff && deno cache src/main.ts && cd ../..

# 環境変数
cp packages/bff/.env.example packages/bff/.env
# .env を編集: GitHub OAuth App の設定値を入力
```

### 6.2 開発サーバー起動

ターミナル 1: BFF

```bash
cd packages/bff && deno task dev
```

ターミナル 2: SPA

```bash
pnpm dev
```

SPA (localhost:5173) -> BFF (localhost:8000) は Vite proxy で接続。

### 6.3 テスト

```bash
# SPA テスト
pnpm test

# SPA カバレッジ
pnpm --filter @ato/spa test:coverage

# BFF テスト
cd packages/bff && deno task test
```

### 6.4 ビルド

```bash
# SPA ビルド (GitHub Pages 用)
pnpm build
# -> packages/spa/dist/

# BFF は Deno Deploy が直接デプロイ (ビルド不要)
```

---

## 7. ブラウザ互換性

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

## 8. .gitignore

```
# Dependencies
node_modules/
.pnpm-store/

# Build
dist/
build/
.next/

# Environment
.env
.env.local
.env.*.local

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

# Deno
.deno/
```
