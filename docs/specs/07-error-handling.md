# 07. エラーハンドリング

## 概要

SPA が GitHub API を直接呼び出すため、全てのエラーハンドリングは SPA で行う。
「ユーザーが次に取るべきアクション」を明示することが方針。

---

## 1. エラー分類

### 1.1 エラー型

```typescript
// apps/spa/src/types/errors.ts

/** 認証エラー */
class AuthError extends Error {
  readonly name = "AuthError";
}

/** GitHub API エラー */
class GitHubApiError extends Error {
  readonly name = "GitHubApiError";
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`GitHub API error: ${status}`);
  }
}

/** ネットワークエラー */
class NetworkError extends Error {
  readonly name = "NetworkError";
}

/** リソース未検出 */
class NotFoundError extends Error {
  readonly name = "NotFoundError";
}

/** リポジトリ作成エラー */
class RepoCreationError extends Error {
  readonly name = "RepoCreationError";
}
```

### 1.2 GitHub API エラー分類マトリクス

| HTTP | 原因                 | リトライ可能 | ユーザーアクション   |
| ---- | -------------------- | ------------ | -------------------- |
| 401  | token 無効/取り消し  | No           | 再ログイン           |
| 403  | 権限不足             | No           | リポジトリ権限を確認 |
| 403  | レート制限 (\*)      | Yes (待機後) | 待ってから再試行     |
| 404  | リソースなし         | No           | 一覧に戻る           |
| 422  | バリデーションエラー | No           | 入力を修正           |
| 5xx  | GitHub サービス障害  | Yes          | 再試行               |

(\*) 403 のうちレート制限は `X-RateLimit-Remaining: 0` で判定する。

---

## 2. SPA エラーハンドリング

### 2.1 GitHub API エラー処理

```typescript
// shared/lib/github-client.ts
async function githubFetch(path: string, options?: RequestInit): Promise<Response> {
  const token = localStorage.getItem("ato:token");
  if (!token) {
    throw new AuthError("Not authenticated");
  }

  let response: Response;
  try {
    response = await fetch(`${GITHUB_API}${path}`, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
  } catch {
    throw new NetworkError("Unable to connect. Please check your internet connection.");
  }

  // 401: token 無効 -> 自動ログアウト
  if (response.status === 401) {
    localStorage.removeItem("ato:token");
    throw new AuthError("Token expired or revoked");
  }

  return response;
}
```

### 2.2 レート制限判定

```typescript
// shared/lib/rate-limit.ts
interface RateLimitInfo {
  readonly remaining: number;
  readonly resetAt: Date;
}

function extractRateLimit(headers: Headers): RateLimitInfo {
  return {
    remaining: Number(headers.get("X-RateLimit-Remaining") ?? 0),
    resetAt: new Date(Number(headers.get("X-RateLimit-Reset") ?? 0) * 1000),
  };
}

function isRateLimited(response: Response): boolean {
  return response.status === 403 && response.headers.get("X-RateLimit-Remaining") === "0";
}
```

---

## 3. SPA エラー表示パターン

### 3.1 エラー表示の種類

| 種類       | 用途                           | 表示位置                 |
| ---------- | ------------------------------ | ------------------------ |
| バナー     | ネットワークエラー、認証エラー | 画面上部 (固定)          |
| インライン | バリデーションエラー           | 入力フィールド直下       |
| トースト   | 操作失敗 (完了トグル、保存)    | 画面右下 (自動消去 5 秒) |
| フルページ | 404、重大エラー                | 画面全体                 |

### 3.2 エラーバナー

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

### 3.3 エラー種別ごとの SPA 対応

| エラー種別           | 表示方法            | リトライ         | 追加アクション             |
| -------------------- | ------------------- | ---------------- | -------------------------- |
| 401 (token 無効)     | なし (リダイレクト) | No               | ログイン画面へ自動遷移     |
| 403 (権限不足)       | バナー              | No               | 「権限を確認してください」 |
| 403 (レート制限)     | バナー              | Yes (リセット後) | 待機時間を表示             |
| 404 (未存在)         | フルページ          | No               | 「一覧に戻る」リンク       |
| 422 (バリデーション) | インライン          | No               | フィールドをハイライト     |
| 5xx (GitHub 障害)    | バナー              | Yes              | 「再試行」ボタン           |
| ネットワークエラー   | バナー              | Yes              | 「再試行」ボタン           |
| リポジトリ作成失敗   | バナー              | Yes              | 「再試行」ボタン           |

### 3.4 ネットワークエラー

GitHub API に到達できない場合 (DNS 解決失敗、タイムアウト等)。

SPA 表示: バナー + 「再試行」ボタン

### 3.5 OAuth Proxy エラー

OAuth フロー中のエラーは postMessage で SPA に通知される。

| エラー         | postMessage                          | SPA 対応         |
| -------------- | ------------------------------------ | ---------------- |
| パラメータ欠落 | `{ error: "missing_params" }`        | エラーメッセージ |
| state 不正     | `{ error: "invalid_state" }`         | 再ログイン促し   |
| token 交換失敗 | `{ error: "token_exchange_failed" }` | 再試行促し       |

---

## 4. TanStack Query のエラーハンドリング

```typescript
// providers.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // 401, 403, 404 はリトライしない
        if (error instanceof AuthError) return false;
        if (error instanceof GitHubApiError && [401, 403, 404, 422].includes(error.status)) {
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

## 5. 楽観的更新のエラーリカバリ

### 5.1 TODO 作成失敗

```text
1. 楽観的に一覧に追加 (一時 ID)
2. GitHub API 呼び出し失敗
3. onError: キャッシュをロールバック (一時 ID のエントリを除去)
4. トースト: "Failed to create todo. Please try again."
```

### 5.2 完了トグル失敗

```text
1. 楽観的に一覧から除外
2. GitHub API 呼び出し失敗
3. onError: キャッシュをロールバック (元のリストに戻す)
4. トースト: "Failed to update todo. Please try again."
```

---

## 6. レート制限管理

SPA は GitHub API のレスポンスヘッダーからレート制限情報を読み取る。

- `X-RateLimit-Remaining` < 100 の場合: 画面に警告表示
- `X-RateLimit-Remaining` = 0 の場合: リセット時刻をカウントダウン表示
- 429 レスポンスの場合: `Retry-After` ヘッダーの秒数を待機後に再試行
