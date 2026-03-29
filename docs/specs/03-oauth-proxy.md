# 03. gh-auth-bridge 連携

ATO は外部認証基盤 `gh-auth-bridge` に依存する。

## 利用する endpoint

- `GET /auth/login`
- `GET /auth/callback`
- `POST /auth/refresh`
- `GET /auth/health`

## popup contract

- success: `{ type: "gh-auth-bridge:auth:success", accessToken, refreshToken?, expiresIn?, refreshTokenExpiresIn? }`
- error: `{ type: "gh-auth-bridge:auth:error", error }`

## shared auth storage keys

- `gh-auth-bridge:token`
- `gh-auth-bridge:refresh-token`
- `gh-auth-bridge:token-expires-at`
- `gh-auth-bridge:refresh-expires-at`

Worker 実装詳細と Cloudflare 運用は `gh-auth-bridge` repo で管理する。
