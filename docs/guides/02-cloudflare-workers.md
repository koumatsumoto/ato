# Cloudflare Workers セットアップ

ATO 自身は Cloudflare Worker を deploy しない。認証基盤 Worker のセットアップは `gh-auth-bridge` repo で行う。

## ATO が依存する設定

- `gh-auth-bridge` Worker が deploy 済みであること
- Worker の `SPA_ORIGIN` が `https://koumatsumoto.github.io` であること
- GitHub App callback URL が Worker `/auth/callback` を指していること

## ATO 側で必要な対応

- GitHub Actions Variable `OAUTH_PROXY_URL` を `gh-auth-bridge` の Worker URL に設定する
- ローカル開発時は `apps/spa/.env` の `VITE_OAUTH_PROXY_URL` を bridge の dev URL に設定する
