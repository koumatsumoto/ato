# 02. Repository Setup

ATO は single-app repository で運用する。

## 主要ディレクトリ

- `src/`
- `tests/`
- `public/`
- `docs/`

認証基盤は外部 repo `gh-auth-bridge` に切り出されており、
この repository には含めない。

## Root scripts

- `pnpm dev`
- `pnpm build`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm lint`
- `pnpm typecheck`

## 認証のローカル連携

- `.env` の `VITE_OAUTH_PROXY_URL` を `gh-auth-bridge` に向ける
- bridge 自体の setup は `gh-auth-bridge` repo で行う
