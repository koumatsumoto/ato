# 08. Security

## Token management

shared auth token は localStorage の以下 key に保存する。

- `gh-auth-bridge:token`
- `gh-auth-bridge:refresh-token`
- `gh-auth-bridge:token-expires-at`
- `gh-auth-bridge:refresh-expires-at`

## リスク低減

- SPA 側で `event.origin` を検証する
- bridge 側で `targetOrigin` を固定する
- refresh endpoint は `Origin === SPA_ORIGIN` を必須化する
- `dangerouslySetInnerHTML` を使わない
- `GITHUB_CLIENT_SECRET` を repo に含めない

## 運用チェック

- `VITE_OAUTH_PROXY_URL` が本番 bridge URL
- `SPA_ORIGIN` が Pages origin と一致
- GitHub App callback URL が `/auth/callback`
- Worker secrets が Cloudflare に設定済み
