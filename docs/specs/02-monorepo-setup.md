# 02. Monorepo Setup

ATO repo は SPA 専用 monorepo とする。

## Packages

- `apps/spa`

認証基盤は外部 repo `gh-auth-bridge` に切り出されており、この repo の workspace には含めない。

## Root scripts

- `pnpm dev`
- `pnpm build`
- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`

## 認証のローカル連携

- `apps/spa/.env` の `VITE_OAUTH_PROXY_URL` を `gh-auth-bridge` に向ける
- bridge 自体の setup は `gh-auth-bridge` repo で行う
