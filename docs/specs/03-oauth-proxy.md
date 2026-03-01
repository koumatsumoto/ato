# 03. OAuth Proxy 設計 (Cloudflare Workers)

## 概要

`apps/oauth-proxy` は GitHub 認証連携の境界層で、以下のみを担当する。

- `/auth/login`: 認証開始
- `/auth/callback`: code 交換 + postMessage 応答
- `/auth/refresh`: refresh token 交換
- `/auth/health`: ヘルスチェック

実装ファイル: `apps/oauth-proxy/src/index.ts`

---

## 1. エンドポイント仕様

### 1.1 `GET /auth/login`

処理:

1. `state` を生成
2. `oauth_state` Cookie (HttpOnly/Secure/SameSite=Lax, 10分) を設定
3. GitHub 認可 URL へ 302 リダイレクト

リダイレクト先例:

```text
https://github.com/login/oauth/authorize
  ?client_id={GITHUB_CLIENT_ID}
  &redirect_uri={OAUTH_PROXY_ORIGIN}/auth/callback
  &state={generated_state}
```

### 1.2 `GET /auth/callback`

処理:

1. `code` / `state` の存在確認
2. Cookie `oauth_state` と照合
3. `https://github.com/login/oauth/access_token` に POST
4. popup 用 HTML を返し、`window.opener.postMessage(...)` で結果を通知
5. `oauth_state` Cookie を削除

postMessage payload:

- 成功: `{ type: "ato:auth:success", accessToken, refreshToken?, expiresIn?, refreshTokenExpiresIn? }`
- 失敗: `{ type: "ato:auth:error", error: "missing_params" | "invalid_state" | "token_exchange_failed" }`

### 1.3 `POST /auth/refresh`

用途: SPA の access token 失効時の再取得。

検証:

- `Origin` ヘッダーが `SPA_ORIGIN` と一致すること
- JSON body を解釈できること
- `refreshToken` が存在すること

外部呼び出し:

```text
POST https://github.com/login/oauth/access_token
{ client_id, client_secret, grant_type: "refresh_token", refresh_token }
```

レスポンス:

- 200: `{ accessToken, refreshToken?, expiresIn?, refreshTokenExpiresIn? }`
- 400: `invalid_request` / `missing_refresh_token`
- 401: `refresh_failed` (token 取得不可)
- 403: `forbidden_origin`
- 502: `refresh_failed` (Upstream エラー)

### 1.4 `GET /auth/health`

- 200 / body: `OK`

---

## 2. CORS とセキュリティ

### 2.1 CORS

`OPTIONS` で以下を返す。

- `Access-Control-Allow-Origin: {SPA_ORIGIN}`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`

### 2.2 セキュリティヘッダー

すべての主要レスポンスで付与:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`

popup HTML には追加で:

- `Content-Security-Policy: default-src 'none'; script-src 'unsafe-inline'`

---

## 3. 環境変数

| 変数名                 | 用途                            | 設定箇所                   |
| ---------------------- | ------------------------------- | -------------------------- |
| `GITHUB_CLIENT_ID`     | GitHub App Client ID            | Secret (`wrangler secret`) |
| `GITHUB_CLIENT_SECRET` | GitHub App Client Secret        | Secret (`wrangler secret`) |
| `SPA_ORIGIN`           | CORS / postMessage 許可オリジン | `wrangler.toml` `[vars]`   |

ローカル開発は `apps/oauth-proxy/.dev.vars` を使用。

---

## 4. テスト方針

`apps/oauth-proxy/src/__tests__/index.test.ts` で以下を検証する。

- login/callback/refresh/health の正常系
- state 不一致や必須パラメータ欠落などの異常系
- Origin 不正時の refresh 拒否
- セキュリティヘッダー/CORS
