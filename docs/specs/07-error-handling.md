# 07. エラーハンドリング

## 概要

ATO は SPA で GitHub API を直接呼び出すため、クライアント側でエラー分類・再試行方針・表示方針を統一する。

---

## 1. エラー型

`apps/spa/src/shared/lib/errors.ts`

- `AuthError`
- `TokenRefreshError` (`reason: "invalid_grant" | "transient"`)
- `GitHubApiError`
- `NetworkError`
- `NotFoundError`
- `RateLimitError`
- `RepoNotConfiguredError`

---

## 2. API クライアントの処理

`apps/spa/src/shared/lib/github-client.ts`

### 2.1 基本

- token 不在: `AuthError`
- ネットワーク失敗: `NetworkError`
- レート制限検知: `RateLimitError`

### 2.2 401 の扱い

1. 401 を検知
2. refresh 関数を呼び出し
3. refresh 成功時は同一リクエストを再試行
4. 再試行後も 401 なら `AuthError`

---

## 3. QueryClient ポリシー

`apps/spa/src/app/providers.tsx`

### 3.1 `queryCache.onError`

- `TokenRefreshError(reason=transient)`: `clearAccessToken()`
- `TokenRefreshError(reason=invalid_grant)`: `clearToken()`
- `AuthError`: `clearToken()`

### 3.2 retry 方針

- `AuthError`: retry なし
- `GitHubApiError(403/404/422)`: retry なし
- それ以外: 最大 2 回

mutations は `retry: false`。

---

## 4. UI 表示方針

### 4.1 表示コンポーネント

- `ErrorBanner`: 通常エラー
- `NotFound`: 単体取得失敗等
- `SetupGuide`: `RepoNotConfiguredError` 専用
- `ListSkeleton` / `DetailSkeleton`: loading 表示

### 4.2 MainPage

`apps/spa/src/app/pages/MainPage.tsx`

- `RepoNotConfiguredError` -> `SetupGuide`
- その他エラー -> `ErrorBanner` + retry

### 4.3 DetailPage

`apps/spa/src/app/pages/DetailPage.tsx`

- エラー -> `ErrorBanner`
- データなし -> `NotFound`

---

## 5. OAuth エラー

### 5.1 callback 起因

| 条件           | postMessage                                                  |
| -------------- | ------------------------------------------------------------ |
| パラメータ欠落 | `{ type: "ato:auth:error", error: "missing_params" }`        |
| state 不一致   | `{ type: "ato:auth:error", error: "invalid_state" }`         |
| token 交換失敗 | `{ type: "ato:auth:error", error: "token_exchange_failed" }` |

### 5.2 refresh 起因

| 条件              | HTTP      | body.error              |
| ----------------- | --------- | ----------------------- |
| Origin 不正       | 403       | `forbidden_origin`      |
| JSON 不正         | 400       | `invalid_request`       |
| refreshToken 欠落 | 400       | `missing_refresh_token` |
| token 交換失敗    | 401 / 502 | `refresh_failed`        |

---

## 6. 下書き復旧

`useAutoSave` で更新失敗時に `NetworkError` なら draft を保存する。
`useDraftRestoration` が次回表示時に復元し、サーバーの `updatedAt` より新しい draft のみ適用する。

---

## 7. ログ観測

`authLog` で認証関連イベントを記録し、`/diagnostics` 画面で確認できる。
