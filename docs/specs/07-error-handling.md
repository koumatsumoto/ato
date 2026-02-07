# 07. エラーハンドリング

## 概要

GitHub API 依存のアプリのため、API 障害・レート制限・認証失敗への対処が重要。
BFF でエラーを正規化し、SPA では「ユーザーが次に取るべきアクション」を明示する。

---

## 1. エラー分類

### 1.1 BFF レスポンスエラー型

```typescript
/** packages/shared に定義 */
interface ApiError {
  readonly code: ErrorCode;
  readonly message: string;
}

type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "REPO_CREATION_FAILED"
  | "INTERNAL_ERROR";
```

### 1.2 エラー分類マトリクス

| カテゴリ     | HTTP | ErrorCode              | リトライ可能 | ユーザーアクション   |
| ------------ | ---- | ---------------------- | ------------ | -------------------- |
| 入力不正     | 400  | `VALIDATION_ERROR`     | No           | 入力を修正           |
| 認証切れ     | 401  | `UNAUTHORIZED`         | No           | 再ログイン           |
| 権限不足     | 403  | `FORBIDDEN`            | No           | リポジトリ権限を確認 |
| 未存在       | 404  | `NOT_FOUND`            | No           | 一覧に戻る           |
| レート制限   | 429  | `RATE_LIMITED`         | Yes (待機後) | 待ってから再試行     |
| GitHub 障害  | 502  | `UPSTREAM_ERROR`       | Yes          | 再試行               |
| リポ作成失敗 | 503  | `REPO_CREATION_FAILED` | Yes          | 再試行 or 手動作成   |
| 内部エラー   | 500  | `INTERNAL_ERROR`       | Yes          | 再試行               |

---

## 2. BFF エラーマッピング (GitHub API -> BFF)

### 2.1 GitHub API エラーハンドラ

```typescript
// services/github-api.ts
function mapGitHubError(
  status: number,
  body: unknown,
): { httpStatus: number; error: ApiError } {
  switch (status) {
    case 401:
      return {
        httpStatus: 401,
        error: {
          code: "UNAUTHORIZED",
          message: "GitHub authentication failed. Please log in again.",
        },
      };
    case 403:
      // レート制限と権限不足を区別
      if (isRateLimited(body)) {
        return {
          httpStatus: 429,
          error: {
            code: "RATE_LIMITED",
            message: "GitHub API rate limit reached. Please wait a moment.",
          },
        };
      }
      return {
        httpStatus: 403,
        error: {
          code: "FORBIDDEN",
          message: "Insufficient permissions for this repository.",
        },
      };
    case 404:
      return {
        httpStatus: 404,
        error: {
          code: "NOT_FOUND",
          message: "The requested item was not found.",
        },
      };
    case 422:
      return {
        httpStatus: 400,
        error: { code: "VALIDATION_ERROR", message: "Invalid request data." },
      };
    default:
      if (status >= 500) {
        return {
          httpStatus: 502,
          error: {
            code: "UPSTREAM_ERROR",
            message: "GitHub is temporarily unavailable. Please try again.",
          },
        };
      }
      return {
        httpStatus: 500,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred.",
        },
      };
  }
}
```

### 2.2 GitHub 401 時のセッション無効化

GitHub API が 401 を返した場合、保存している access_token が無効化されている。
BFF はセッションを削除し、SPA に 401 を返す。

```
GitHub 401
  -> BFF: Deno KV からセッション削除
  -> BFF: 401 UNAUTHORIZED を SPA に返却
  -> SPA: localStorage クリア、ログイン画面へ
```

---

## 3. BFF レベルレート制限

GitHub API のレート制限とは別に、BFF 自体にもレート制限を設ける。
Deno KV のカウンターを使用した固定ウィンドウ方式。

### 3.1 制限値

| エンドポイントグループ | 制限          | ウィンドウ |
| ---------------------- | ------------- | ---------- |
| `/auth/*`              | 10 リクエスト | 1 分       |
| `GET /todos*`          | 60 リクエスト | 1 分       |
| `POST/PATCH /todos*`   | 30 リクエスト | 1 分       |

### 3.2 レスポンスヘッダー

レート制限情報を BFF レスポンスヘッダーで返す。

```
X-RateLimit-Remaining: 55
X-RateLimit-Reset: 2026-02-07T10:01:00Z
```

### 3.3 429 レスポンス

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please wait before trying again."
  }
}
```

`Retry-After` ヘッダーも付与。

---

## 4. GitHub API レート制限の転送

BFF は GitHub API のレスポンスから `X-RateLimit-*` ヘッダーを読み取り、BFF レスポンスの `meta` に含める。

```typescript
function extractRateLimit(headers: Headers): RateLimitInfo {
  return {
    remaining: Number(headers.get("X-RateLimit-Remaining") ?? 0),
    resetAt: new Date(
      Number(headers.get("X-RateLimit-Reset") ?? 0) * 1000,
    ).toISOString(),
  };
}
```

SPA はこの情報を使い、残りリクエスト数が少ない場合に警告を表示できる。

---

## 5. SPA エラー表示パターン

### 5.1 エラー表示の種類

| 種類       | 用途                           | 表示位置                 |
| ---------- | ------------------------------ | ------------------------ |
| バナー     | ネットワークエラー、認証エラー | 画面上部 (固定)          |
| インライン | バリデーションエラー           | 入力フィールド直下       |
| トースト   | 操作失敗 (完了トグル、保存)    | 画面右下 (自動消去 5 秒) |
| フルページ | 404、重大エラー                | 画面全体                 |

### 5.2 エラーバナー

```typescript
function ErrorBanner({ error, onRetry, onDismiss }: ErrorBannerProps) {
  return (
    <div role="alert" className="border-l-4 border-red-500 bg-red-50 px-4 py-3">
      <p className="text-sm text-red-700">{error.message}</p>
      <div className="mt-2 flex gap-2">
        {onRetry && (
          <button onClick={onRetry} className="text-sm font-medium text-red-700 underline">
            Retry
          </button>
        )}
        {onDismiss && (
          <button onClick={onDismiss} className="text-sm text-red-500">
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
```

### 5.3 エラーコード別の SPA 対応

| ErrorCode              | 表示方法            | リトライ             | 追加アクション             |
| ---------------------- | ------------------- | -------------------- | -------------------------- |
| `VALIDATION_ERROR`     | インライン          | No                   | フィールドをハイライト     |
| `UNAUTHORIZED`         | なし (リダイレクト) | No                   | ログイン画面へ自動遷移     |
| `FORBIDDEN`            | バナー              | No                   | 「権限を確認してください」 |
| `NOT_FOUND`            | フルページ          | No                   | 「一覧に戻る」リンク       |
| `RATE_LIMITED`         | バナー              | Yes (Retry-After 後) | 待機時間を表示             |
| `UPSTREAM_ERROR`       | バナー              | Yes                  | 「再試行」ボタン           |
| `REPO_CREATION_FAILED` | バナー              | Yes                  | 「再試行」ボタン           |
| `INTERNAL_ERROR`       | バナー              | Yes                  | 「再試行」ボタン           |

### 5.4 ネットワークエラー (fetch 失敗)

BFF に到達できない場合 (DNS 解決失敗、タイムアウト等)。

```typescript
// api-client.ts
async function fetchWithAuth(path: string, options?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(`${BFF_URL}${path}`, { ... });
    // ...
  } catch (error) {
    // TypeError: Failed to fetch (ネットワークエラー)
    throw new NetworkError("Unable to connect. Please check your internet connection.");
  }
}
```

SPA 表示: バナー + 「再試行」ボタン

### 5.5 TanStack Query のエラーハンドリング

```typescript
// providers.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // 401, 403, 404 はリトライしない
        if (
          error instanceof ApiClientError &&
          [401, 403, 404].includes(error.status)
        ) {
          return false;
        }
        return failureCount < 2; // 最大 2 回リトライ
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
    mutations: {
      retry: false, // mutation はリトライしない (楽観的更新のロールバック)
    },
  },
});
```

---

## 6. 楽観的更新のエラーリカバリ

### 6.1 TODO 作成失敗

```
1. 楽観的に一覧に追加 (一時 ID)
2. API 呼び出し失敗
3. onError: キャッシュをロールバック (一時 ID のエントリを除去)
4. トースト: "Failed to create todo. Please try again."
```

### 6.2 完了トグル失敗

```
1. 楽観的に一覧から除外
2. API 呼び出し失敗
3. onError: キャッシュをロールバック (元のリストに戻す)
4. トースト: "Failed to update todo. Please try again."
```

---

## 7. グローバルエラーハンドラ (BFF)

```typescript
// middleware/error-handler.ts
import type { ErrorHandler } from "hono";

const errorHandler: ErrorHandler = (err, c) => {
  // バリデーションエラー (zod)
  if (err instanceof ZodError) {
    return c.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: formatZodError(err) },
      },
      400,
    );
  }

  // GitHub API エラー
  if (err instanceof GitHubApiError) {
    const mapped = mapGitHubError(err.status, err.body);
    return c.json({ success: false, error: mapped.error }, mapped.httpStatus);
  }

  // 認証エラー
  if (err instanceof AuthError) {
    return c.json(
      { success: false, error: { code: "UNAUTHORIZED", message: err.message } },
      401,
    );
  }

  // 未知のエラー (ログに記録、詳細はクライアントに返さない)
  // NOTE: console.error は本番 BFF でのログ出力用。SPA 側には使用しない
  console.error("Unhandled error:", err);
  return c.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
      },
    },
    500,
  );
};
```
