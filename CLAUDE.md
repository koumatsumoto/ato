# ATO - GitHub Issues TODO App

GitHub Issues をバックエンドに使う軽量 TODO アプリ。1 Issue = 1 TODO。

## テックスタック

| レイヤー       | 技術                                                              |
| -------------- | ----------------------------------------------------------------- |
| SPA            | React 19, TypeScript 5, Vite 6, TailwindCSS 4, React Router 7     |
| サーバー状態   | TanStack Query 5（楽観的更新、無限スクロール）                    |
| バリデーション | Zod 3                                                             |
| OAuth Proxy    | Cloudflare Workers, wrangler 4                                    |
| テスト         | Vitest 4, Testing Library 16, MSW 2, jsdom                        |
| ツール         | pnpm 10, ESLint 9 (flat config), Prettier 3, husky 9, lint-staged |

## プロジェクト構造

```text
ato/                          # pnpm workspace モノリポ
├── apps/
│   ├── spa/                  # React SPA (GitHub Pages)
│   │   └── src/
│   │       ├── app/          # App.tsx, router, providers, pages/
│   │       ├── features/
│   │       │   ├── auth/     # hooks/, lib/, components/
│   │       │   └── todos/    # hooks/, lib/, components/
│   │       ├── shared/       # lib/ (github-client, env, rate-limit), components/
│   │       └── types/        # auth.ts, todo.ts, github.ts, errors.ts
│   └── oauth-proxy/          # Cloudflare Workers (~150行)
│       └── src/index.ts
├── docs/
│   ├── specs/                # 仕様書 01〜09
│   └── guides/               # セットアップガイド 01〜04
└── .github/workflows/        # ci.yml, deploy-spa.yml, deploy-oauth-proxy.yml
```

Feature-driven 構成: コードは種別（components, hooks）ではなくドメイン（auth, todos）で整理。

## 開発コマンド

```bash
pnpm dev              # SPA 開発サーバー (localhost:5173/ato)
pnpm dev:proxy        # OAuth Proxy (localhost:8787)
pnpm build            # SPA ビルド (tsc + vite)
pnpm test             # 全テスト実行 (SPA + OAuth Proxy)
pnpm test -- --coverage  # カバレッジ付き
pnpm lint             # ESLint (SPA)
pnpm typecheck        # TypeScript 型チェック (両パッケージ)
pnpm format           # Prettier フォーマット
pnpm lint:md          # Markdownlint
```

Vite dev server は `/auth/*` を自動的に localhost:8787 にプロキシする。

## アーキテクチャ

### 認証フロー

1. SPA がポップアップで OAuth Proxy `/auth/login` を開く
2. OAuth Proxy が state を HttpOnly Cookie に保存し GitHub OAuth へリダイレクト
3. GitHub がコード付きで `/auth/callback` にリダイレクト
4. OAuth Proxy が state 検証後コードを access_token に交換
5. postMessage（origin 検証済み）で SPA にトークン送信
6. SPA が localStorage (`ato:token`) に保存

### データフロー

SPA が GitHub REST API (`api.github.com`) を直接呼び出す（CORS 対応）。プライベートリポジトリ `ato-datastore` に Issue として TODO を保存。初回 TODO 作成時にリポジトリを自動作成。

### GitHub API エンドポイント

```text
GET    /repos/{login}/ato-datastore/issues          # TODO 一覧
POST   /repos/{login}/ato-datastore/issues          # TODO 作成
GET    /repos/{login}/ato-datastore/issues/{id}     # TODO 取得
PATCH  /repos/{login}/ato-datastore/issues/{id}     # TODO 更新 (close/reopen)
POST   /user/repos                                  # リポジトリ自動作成
GET    /user                                        # ユーザー情報
```

## 重要ファイル

| 機能               | ファイル                                              |
| ------------------ | ----------------------------------------------------- |
| 認証コンテキスト   | `apps/spa/src/features/auth/hooks/use-auth.tsx`       |
| OAuth クライアント | `apps/spa/src/features/auth/lib/auth-client.ts`       |
| トークン保存       | `apps/spa/src/features/auth/lib/token-store.ts`       |
| ルート保護         | `apps/spa/src/features/auth/components/AuthGuard.tsx` |
| TODO CRUD hooks    | `apps/spa/src/features/todos/hooks/use-todos.ts`      |
| GitHub API         | `apps/spa/src/features/todos/lib/github-api.ts`       |
| Issue->Todo 変換   | `apps/spa/src/features/todos/lib/issue-mapper.ts`     |
| リポジトリ初期化   | `apps/spa/src/features/todos/lib/repo-init.ts`        |
| バリデーション     | `apps/spa/src/features/todos/lib/validation.ts`       |
| ページネーション   | `apps/spa/src/features/todos/lib/pagination.ts`       |
| HTTP クライアント  | `apps/spa/src/shared/lib/github-client.ts`            |
| レート制限         | `apps/spa/src/shared/lib/rate-limit.ts`               |
| エラーバナー       | `apps/spa/src/shared/components/ui/ErrorBanner.tsx`   |
| 環境変数           | `apps/spa/src/shared/lib/env.ts`                      |
| エラー型           | `apps/spa/src/types/errors.ts`                        |
| ルーター           | `apps/spa/src/app/router.tsx`                         |
| プロバイダー       | `apps/spa/src/app/providers.tsx`                      |
| OAuth Proxy        | `apps/oauth-proxy/src/index.ts`                       |
| OAuth Proxy テスト | `apps/oauth-proxy/src/__tests__/index.test.ts`        |

## 環境変数

### SPA (`apps/spa/.env`)

```env
VITE_OAUTH_PROXY_URL=http://localhost:8787
```

### OAuth Proxy (`apps/oauth-proxy/.dev.vars`)

```env
GITHUB_CLIENT_ID=<GitHub OAuth App ID>
GITHUB_CLIENT_SECRET=<GitHub OAuth App Secret>
SPA_ORIGIN=http://localhost:5173
```

本番: `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` は Cloudflare Secrets、`SPA_ORIGIN` は wrangler.toml の vars。

## テスト

- フレームワーク: Vitest 4 + jsdom + MSW 2
- カバレッジ: v8 プロバイダー、80%+ 必須（OAuth Proxy は閾値強制）
- テスト配置: `src/**/__tests__/**/*.test.{ts,tsx}`
- セットアップ: `apps/spa/src/shared/__tests__/setup.ts`
- テストデータ: `apps/spa/src/shared/__tests__/factories.ts`

## CI/CD

1. **ci.yml**: PR/push to main -> Prettier, markdownlint, ESLint, tsc, Vitest (両パッケージ)
2. **deploy-spa.yml**: CI 成功後 -> Vite ビルド -> GitHub Pages (`/ato/`)
3. **deploy-oauth-proxy.yml**: CI 成功後 -> wrangler deploy -> Cloudflare Workers

## コーディング規約

- パスエイリアス: `@/*` -> `./src/*` (SPA)
- Prettier: `printWidth: 150`
- TypeScript: 全 strict オプション有効（`exactOptionalPropertyTypes` 含む）
- ESLint: flat config + TypeScript ESLint + React Hooks/Refresh
- pre-commit: lint-staged（ESLint fix + Prettier + markdownlint）
- SPA ベースパス: `/ato/`（GitHub Pages サブパス）

## 仕様書

詳細な設計情報は `docs/specs/` を参照:

| ファイル             | 内容                   |
| -------------------- | ---------------------- |
| 01-architecture.md   | システム設計、ADR      |
| 02-monorepo-setup.md | ワークスペース設定     |
| 03-oauth-proxy.md    | OAuth Proxy 実装詳細   |
| 04-auth-flow.md      | 認証フロー詳細         |
| 05-spa-design.md     | SPA 構造、ルーティング |
| 06-data-model.md     | データ型、スキーマ     |
| 07-error-handling.md | エラーハンドリング戦略 |
| 08-security.md       | セキュリティ対策       |
| 09-ci-cd.md          | CI/CD パイプライン     |
