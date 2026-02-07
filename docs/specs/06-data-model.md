# 06. データモデル

## 概要

ATO は独自の DB を持たない。TODO データは GitHub Issues に、セッション情報は Deno KV に保存する。

---

## 1. TODO データ (GitHub Issue マッピング)

### 1.1 Todo 型定義

```typescript
/** SPA / BFF 共通の Todo 型 (packages/shared) */
interface Todo {
  readonly id: number; // GitHub Issue number (#1, #2, ...)
  readonly title: string; // Issue title (1-256 文字)
  readonly body: string; // Issue body (プレーンテキスト、0-65536 文字)
  readonly state: "open" | "closed";
  readonly createdAt: string; // ISO 8601
  readonly updatedAt: string; // ISO 8601
  readonly closedAt: string | null;
  readonly url: string; // GitHub Issue URL
}
```

### 1.2 フィールドマッピング

| Todo        | GitHub Issue | 備考                                              |
| ----------- | ------------ | ------------------------------------------------- |
| `id`        | `number`     | Issue 番号。リポジトリ内で一意                    |
| `title`     | `title`      | 必須。1-256 文字                                  |
| `body`      | `body`       | 任意。プレーンテキスト。null の場合は空文字に変換 |
| `state`     | `state`      | `"open"` = 未完了、`"closed"` = 完了              |
| `createdAt` | `created_at` | ISO 8601                                          |
| `updatedAt` | `updated_at` | ISO 8601。並び順のキー                            |
| `closedAt`  | `closed_at`  | 完了日時。open の場合 null                        |
| `url`       | `html_url`   | GitHub 上の Issue ページ URL                      |

### 1.3 GitHub Issue -> Todo 変換

```typescript
function mapIssueToTodo(issue: GitHubIssue): Todo {
  return {
    id: issue.number,
    title: issue.title,
    body: issue.body ?? "",
    state: issue.state as "open" | "closed",
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    closedAt: issue.closed_at,
    url: issue.html_url,
  };
}
```

### 1.4 入力型

```typescript
/** TODO 作成 */
interface CreateTodoInput {
  readonly title: string; // 必須、1-256 文字
  readonly body?: string; // 任意、0-65536 文字
}

/** TODO 更新 */
interface UpdateTodoInput {
  readonly title?: string; // 1-256 文字
  readonly body?: string; // 0-65536 文字
}
// title と body のどちらか一方は必須
```

---

## 2. API レスポンス型 (共有)

```typescript
/** 標準 API レスポンスエンベロープ */
interface ApiResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}

/** ページネーション付きレスポンス */
interface PaginatedResponse<T> extends ApiResponse<T[]> {
  readonly meta?: {
    readonly hasNextPage: boolean;
    readonly nextCursor?: string; // base64 エンコードされたページ番号
    readonly rateLimit: {
      readonly remaining: number;
      readonly resetAt: string; // ISO 8601
    };
  };
}
```

---

## 3. 認証関連型 (共有)

```typescript
/** ユーザー情報 */
interface AuthUser {
  readonly login: string; // GitHub ユーザー名
  readonly id: number; // GitHub ユーザー ID
  readonly avatarUrl: string; // アバター URL
}
```

---

## 4. Deno KV スキーマ (BFF 内部)

### 4.1 セッション

```
Key:   ["sessions", <sessionToken>]
Value: Session
TTL:   24 時間
```

```typescript
interface Session {
  readonly githubAccessToken: string;
  readonly githubLogin: string;
  readonly githubId: number;
  readonly createdAt: string; // ISO 8601
  readonly expiresAt: string; // ISO 8601
}
```

- sessionToken: 32 byte ランダム hex (64 文字)
- スライディング有効期限: 残り 12 時間未満の場合、リクエスト時に 24 時間延長

### 4.2 OAuth State (CSRF 対策)

```
Key:   ["oauth_states", <state>]
Value: OAuthState
TTL:   10 分
```

```typescript
interface OAuthState {
  readonly createdAt: string;
  readonly spaOrigin: string; // postMessage のターゲットオリジン
}
```

### 4.3 リポジトリ初期化キャッシュ

```
Key:   ["repo_initialized", <githubLogin>]
Value: RepoInitStatus
TTL:   7 日
```

```typescript
interface RepoInitStatus {
  readonly initialized: boolean;
  readonly repoFullName: string; // "user/ato-datastore"
  readonly initializedAt: string;
}
```

### 4.4 ユーザーキャッシュ

```
Key:   ["user_cache", <githubLogin>]
Value: AuthUser
TTL:   5 分
```

`GET /auth/me` のレスポンスをキャッシュし、GitHub API 呼び出しを削減。

---

## 5. リポジトリ自動作成

### 5.1 概要

ユーザーが初めて TODO 操作を行う際、`ato-datastore` リポジトリが存在しない場合は自動作成する。

### 5.2 フロー

```
認証済みリクエスト (/todos/*)
  |
  v
Deno KV ["repo_initialized", login] を確認
  |
  +-- キャッシュあり --> そのまま処理続行
  |
  +-- キャッシュなし --> GitHub API で確認
       |
       +-- GET /repos/{login}/ato-datastore
       |
       +-- 200 (存在する) --> Deno KV にキャッシュ --> 処理続行
       |
       +-- 404 (存在しない) --> リポジトリ作成
            |
            POST /user/repos
            {
              name: "ato-datastore",
              private: true,
              description: "Data store for ATO app",
              auto_init: true,
              has_issues: true,
              has_projects: false,
              has_wiki: false
            }
            |
            +-- 201 --> Deno KV にキャッシュ --> 処理続行
            +-- 422 (既存) --> 成功として扱い、キャッシュ
            +-- その他エラー --> 503 REPO_CREATION_FAILED
```

### 5.3 リポジトリ設定

| 設定           | 値                         | 理由                              |
| -------------- | -------------------------- | --------------------------------- |
| `name`         | `"ato-datastore"`          | 固定名。ユーザーごとに 1 つ       |
| `private`      | `true`                     | TODO データを非公開にする         |
| `auto_init`    | `true`                     | README.md を自動生成 (空リポ回避) |
| `has_issues`   | `true`                     | Issue が必須                      |
| `has_projects` | `false`                    | 不要な機能を無効化                |
| `has_wiki`     | `false`                    | 不要な機能を無効化                |
| `description`  | `"Data store for ATO app"` | リポジトリの用途を明示            |

---

## 6. GitHub API レート制限

| 項目                             | 値                        |
| -------------------------------- | ------------------------- |
| 認証済みリクエスト上限           | 5,000 回/時               |
| 1 TODO 操作あたりの API 呼び出し | 1 回                      |
| 一覧取得                         | 1 回                      |
| リポジトリ初期化                 | 1-2 回 (キャッシュ後は 0) |

個人利用であれば、レート制限に達することはほぼない。
BFF レスポンスの `meta.rateLimit` で残りリクエスト数を SPA に通知する。

---

## 7. ページネーション

GitHub Issues API はページベースのページネーション (`Link` ヘッダー) を採用。
BFF はこれをカーソルベースに変換して SPA に提供する。

- カーソル: GitHub のページ番号を base64 エンコードした文字列
- `hasNextPage`: `Link` ヘッダーの `rel="next"` 有無で判定
- `nextCursor`: 次ページ番号の base64 エンコード

```
GitHub Link ヘッダー:
  <...?page=2>; rel="next", <...?page=5>; rel="last"

BFF レスポンス:
  meta.hasNextPage: true
  meta.nextCursor: "Mg=="  (= "2" の base64)
```
