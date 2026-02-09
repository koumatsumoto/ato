# ATO - 日々の跡を残すメモアプリ

GitHub Issues をバックエンドに使うメモアプリ。1 Issue = 1 やること(Action)。
用語の詳細は `docs/specs/10-terminology.md` を参照。

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
│   │   ├── src/
│   │   │   ├── app/          # App.tsx, router, providers, pages/
│   │   │   ├── features/
│   │   │   │   ├── auth/     # hooks/, lib/, components/, types.ts
│   │   │   │   └── actions/  # hooks/, lib/, components/, types.ts
│   │   │   └── shared/       # lib/ (github-client, env, errors), hooks/, components/
│   │   └── tests/            # 全テスト (app/, features/, shared/, factories.ts)
│   └── oauth-proxy/          # Cloudflare Workers (~150行)
│       └── src/index.ts
├── docs/
│   ├── specs/                # 仕様書 01〜10
│   └── guides/               # セットアップガイド 01〜04
└── .github/workflows/        # ci.yml, deploy-spa.yml, deploy-oauth-proxy.yml
```

Feature-driven 構成: コードは種別（components, hooks）ではなくドメイン（auth, actions）で整理。

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

SPA が GitHub REST API (`api.github.com`) を直接呼び出す（CORS 対応）。プライベートリポジトリ `ato-datastore` に Issue としてやることを保存。初回作成時にリポジトリを自動作成。

### GitHub API エンドポイント

```text
GET    /repos/{login}/ato-datastore/issues          # やること一覧
POST   /repos/{login}/ato-datastore/issues          # やること作成
GET    /repos/{login}/ato-datastore/issues/{id}     # やること取得
PATCH  /repos/{login}/ato-datastore/issues/{id}     # やること更新 (close/reopen)
GET    /search/issues?q=repo:{login}/ato-datastore  # やること検索
POST   /user/repos                                  # リポジトリ自動作成
GET    /user                                        # ユーザー情報
```

## 重要ファイル

| 機能               | ファイル                                               |
| ------------------ | ------------------------------------------------------ |
| 認証コンテキスト   | `apps/spa/src/features/auth/hooks/use-auth.tsx`        |
| OAuth クライアント | `apps/spa/src/features/auth/lib/auth-client.ts`        |
| トークン保存       | `apps/spa/src/features/auth/lib/token-store.ts`        |
| ルート保護         | `apps/spa/src/features/auth/components/AuthGuard.tsx`  |
| Action CRUD hooks  | `apps/spa/src/features/actions/hooks/use-actions.ts`   |
| 自動保存フック     | `apps/spa/src/features/actions/hooks/use-auto-save.ts` |
| 検索フック         | `apps/spa/src/features/actions/hooks/use-search.ts`    |
| GitHub API         | `apps/spa/src/features/actions/lib/github-api.ts`      |
| 検索 API           | `apps/spa/src/features/actions/lib/search-api.ts`      |
| Issue->Action 変換 | `apps/spa/src/features/actions/lib/issue-mapper.ts`    |
| リポジトリ初期化   | `apps/spa/src/features/actions/lib/repo-init.ts`       |
| バリデーション     | `apps/spa/src/features/actions/lib/validation.ts`      |
| ページネーション   | `apps/spa/src/features/actions/lib/pagination.ts`      |
| デバウンスフック   | `apps/spa/src/shared/hooks/use-debounce.ts`            |
| 相対時間フック     | `apps/spa/src/shared/hooks/use-relative-time.ts`       |
| 外クリックフック   | `apps/spa/src/shared/hooks/use-click-outside.ts`       |
| HTTP クライアント  | `apps/spa/src/shared/lib/github-client.ts`             |
| レート制限         | `apps/spa/src/shared/lib/rate-limit.ts`                |
| エラーバナー       | `apps/spa/src/shared/components/ui/ErrorBanner.tsx`    |
| 環境変数           | `apps/spa/src/shared/lib/env.ts`                       |
| エラー型           | `apps/spa/src/shared/lib/errors.ts`                    |
| Action ドメイン型  | `apps/spa/src/features/actions/types.ts`               |
| Auth ドメイン型    | `apps/spa/src/features/auth/types.ts`                  |
| ルーター           | `apps/spa/src/app/router.tsx`                          |
| プロバイダー       | `apps/spa/src/app/providers.tsx`                       |
| OAuth Proxy        | `apps/oauth-proxy/src/index.ts`                        |
| OAuth Proxy テスト | `apps/oauth-proxy/src/__tests__/index.test.ts`         |

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
- テスト配置: `apps/spa/tests/**/*.test.{ts,tsx}`
- セットアップ: `apps/spa/tests/setup.ts`
- テストデータ: `apps/spa/tests/factories.ts`

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

| ファイル             | 内容                        |
| -------------------- | --------------------------- |
| 01-architecture.md   | システム設計、ADR           |
| 02-monorepo-setup.md | ワークスペース設定          |
| 03-oauth-proxy.md    | OAuth Proxy 実装詳細        |
| 04-auth-flow.md      | 認証フロー詳細              |
| 05-spa-design.md     | SPA 構造、ルーティング      |
| 06-data-model.md     | データ型、スキーマ          |
| 07-error-handling.md | エラーハンドリング戦略      |
| 08-security.md       | セキュリティ対策            |
| 09-ci-cd.md          | CI/CD パイプライン          |
| 10-terminology.md    | 用語定義（やること/Action） |
