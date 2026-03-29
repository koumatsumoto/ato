# ATO - あとでやることを残すメモアプリ

GitHub Issues をバックエンドに使うメモアプリ。認証基盤は公開リポジトリ [`gh-auth-bridge`](https://github.com/koumatsumoto/gh-auth-bridge) の Cloudflare Worker を共有利用する。

## テックスタック

| レイヤー       | 技術                                                          |
| -------------- | ------------------------------------------------------------- |
| SPA            | React 19, TypeScript 6, Vite 8, TailwindCSS 4, React Router 7 |
| サーバー状態   | TanStack Query 5                                              |
| バリデーション | Zod 3                                                         |
| 認証基盤       | `gh-auth-bridge` (Cloudflare Workers, 別リポジトリ)           |
| テスト         | Vitest 4, Testing Library 16, MSW 2, jsdom                    |
| ツール         | pnpm 10, ESLint 9, Prettier 3, husky 9, lint-staged           |

## プロジェクト構造

```text
ato/
├── apps/
│   └── spa/                  # React SPA (GitHub Pages)
├── docs/
│   ├── specs/
│   └── guides/
└── .github/workflows/        # ci.yml, deploy-spa.yml
```

## 開発コマンド

```bash
pnpm dev              # SPA 開発サーバー (localhost:5173/ato)
pnpm build            # SPA ビルド
pnpm test             # SPA テスト
pnpm lint             # ESLint
pnpm typecheck        # TypeScript 型チェック
pnpm format           # Prettier
pnpm lint:md          # Markdownlint
```

`gh-auth-bridge` をローカルで併走する場合は、別 repo 側で `pnpm dev` を実行し、`apps/spa/.env` の `VITE_OAUTH_PROXY_URL` をその Worker URL に向ける。

## 認証フロー

1. SPA が popup で `gh-auth-bridge` の `/auth/login` を開く
2. bridge が GitHub OAuth へリダイレクトし、callback で code を token に交換
3. bridge が `postMessage` で SPA に token 情報を返す
4. SPA が localStorage の共有 auth key に保存する

共有 auth key:

- `gh-auth-bridge:token`
- `gh-auth-bridge:refresh-token`
- `gh-auth-bridge:token-expires-at`
- `gh-auth-bridge:refresh-expires-at`

ATO 固有 key:

- `ato:user`
- `ato:repo-initialized`
- `ato:action-order`

## 重要ファイル

| 機能               | ファイル                                              |
| ------------------ | ----------------------------------------------------- |
| 認証コンテキスト   | `apps/spa/src/features/auth/hooks/use-auth.tsx`       |
| OAuth クライアント | `apps/spa/src/features/auth/lib/auth-client.ts`       |
| トークン保存       | `apps/spa/src/features/auth/lib/token-store.ts`       |
| ルート保護         | `apps/spa/src/features/auth/components/AuthGuard.tsx` |
| GitHub API         | `apps/spa/src/shared/lib/github-client.ts`            |
| 環境変数           | `apps/spa/src/shared/lib/env.ts`                      |

## 環境変数

### SPA (`apps/spa/.env`)

```env
VITE_OAUTH_PROXY_URL=http://localhost:8787
```

本番では GitHub Actions Variable `OAUTH_PROXY_URL` が `VITE_OAUTH_PROXY_URL` に注入される。この値は `gh-auth-bridge` の本番 Worker URL と一致させること。

## テスト

- Vitest 4 + jsdom + MSW 2
- テスト配置: `apps/spa/tests/**/*.test.{ts,tsx}`
- セットアップ: `apps/spa/tests/setup.ts`

## CI/CD

1. `ci.yml`: PR / push -> format, markdownlint, eslint, tsc, Vitest
2. `deploy-spa.yml`: CI success 後に GitHub Pages へ deploy

`gh-auth-bridge` の deploy は別リポジトリ側の workflow で管理する。

## コーディング規約

- `@/*` path alias
- strict TypeScript
- `erasableSyntaxOnly` 有効
- localStorage の auth key は `gh-auth-bridge:` prefix を共有用途に限定し、ATO 固有データには使わない
