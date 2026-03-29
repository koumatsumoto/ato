# 04. Auth Flow

## Login

1. SPA が `VITE_OAUTH_PROXY_URL/auth/login` を popup で開く
2. `gh-auth-bridge` が GitHub OAuth へリダイレクト
3. callback 完了後、popup から `gh-auth-bridge:auth:success` または `gh-auth-bridge:auth:error` を `postMessage`
4. SPA は token を shared auth key に保存する

## Refresh

1. access token 失効時、SPA は refresh token を読む
2. `POST /auth/refresh` を bridge へ送る
3. bridge から新 token 群を受け取り shared auth key を更新する

## Storage

- `gh-auth-bridge:token`
- `gh-auth-bridge:refresh-token`
- `gh-auth-bridge:token-expires-at`
- `gh-auth-bridge:refresh-expires-at`
