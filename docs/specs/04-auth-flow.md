# 04. 認証フロー詳細

## 概要

ATO の認証は GitHub 認可画面を popup で開く方式を採用する。
OAuth Proxy が code/token 交換を担い、SPA は GitHub API を直接呼び出す。

- SPA と OAuth Proxy は別オリジン
- postMessage で token 情報を返却
- access token / refresh token は SPA の `localStorage` に保持

---

## 1. ログインフロー

```text
SPA                        OAuth Proxy                    GitHub
 |                             |                           |
 | window.open(/auth/login)    |                           |
 |---------------------------->|                           |
 |                             | state生成 + Cookie保存     |
 |                             | 302 authorize             |
 |                             |-------------------------->|
 |                             |                           | 認可
 |                             |<--------------------------|
 |                             | /auth/callback?code&state |
 |                             | state検証 + token交換      |
 |<----------------------------| postMessage(type=success) |
 | token保存                    |                           |
 | GET /user                   |                           |
 |-----------------------------> api.github.com            |
```

---

## 2. SPA 側実装ポイント

### 2.1 popup 起動と受信

`openLoginPopup(proxyUrl)` の流れ:

- `window.open("{proxyUrl}/auth/login")`
- `message` イベントで `event.origin === new URL(proxyUrl).origin` を検証
- `type === "ato:auth:success"` で token 情報を返す
- popup close / timeout / 手動 close をハンドリング

### 2.2 token 保存

`setTokenSet()` が以下を保存する。

- `ato:token`
- `ato:refresh-token` (存在時)
- `ato:token-expires-at` (存在時)
- `ato:refresh-expires-at` (存在時)

### 2.3 認証状態

`AuthProvider`:

- 起動時に `ato:token` を読み込み
- token がある場合のみ `/user` を取得
- `TOKEN_CLEARED_EVENT` / `TOKEN_REFRESHED_EVENT` を監視して state を同期

---

## 3. 失効時のリフレッシュフロー

`githubFetch()` の処理:

1. API 呼び出し
2. 401 の場合、登録済み refresh 関数を実行
3. refresh 成功なら新 token で再試行
4. 再試行でも 401 の場合は `AuthError`

refresh 関数 (`register-token-refresh.ts`):

- `ato:refresh-token` が無い場合は失敗
- `/auth/refresh` を呼び出し
- 成功時に `setTokenSet()` で更新
- 同時 refresh は `refreshPromise` で 1 本化

---

## 4. OAuth Proxy 側処理

### 4.1 `/auth/login`

- `oauth_state` Cookie を 10 分で発行
- `redirect_uri={proxyOrigin}/auth/callback`

### 4.2 `/auth/callback`

- `code` と `state` を検証
- Cookie state と照合
- token endpoint 呼び出し
- HTML + `postMessage` 応答

### 4.3 `/auth/refresh`

- `Origin` 検証 (`SPA_ORIGIN` と一致必須)
- `refreshToken` を受けて token endpoint 呼び出し
- `accessToken` を JSON で返却

---

## 5. エラーシナリオ

### 5.1 login/callback

| 条件            | SPA に返るエラー        |
| --------------- | ----------------------- |
| code/state 欠落 | `missing_params`        |
| state 不一致    | `invalid_state`         |
| token 交換失敗  | `token_exchange_failed` |

### 5.2 refresh

| 条件              | HTTP    | エラー                  |
| ----------------- | ------- | ----------------------- |
| Origin 不正       | 403     | `forbidden_origin`      |
| JSON 不正         | 400     | `invalid_request`       |
| refreshToken 欠落 | 400     | `missing_refresh_token` |
| token 交換失敗    | 401/502 | `refresh_failed`        |

---

## 6. 開発環境

- SPA: `http://localhost:5173`
- OAuth Proxy: `http://localhost:8787`
- `VITE_OAUTH_PROXY_URL=http://localhost:8787`
- GitHub App callback URL (開発): `http://localhost:8787/auth/callback`
