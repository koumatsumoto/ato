# 06. データモデル

## 概要

ATO は独自の DB を持たない。TODO データは GitHub Issues に保存する。
認証トークンとキャッシュは SPA の localStorage に保存する。

---

## 1. TODO データ (GitHub Issue マッピング)

### 1.1 Todo 型定義

```typescript
/** SPA 内部の Todo 型 (apps/spa/src/types/todo.ts) */
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
// SPA: features/todos/lib/issue-mapper.ts
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

## 2. GitHub API レスポンス型

SPA が GitHub REST API を直接呼び出すため、GitHub のレスポンス型を定義する。

```typescript
// apps/spa/src/types/github.ts

/** GitHub Issue (REST API レスポンス) */
interface GitHubIssue {
  readonly number: number;
  readonly title: string;
  readonly body: string | null;
  readonly state: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly closed_at: string | null;
  readonly html_url: string;
  readonly pull_request?: unknown; // PR の場合のみ存在
}

/** GitHub User (REST API レスポンス) */
interface GitHubUser {
  readonly login: string;
  readonly id: number;
  readonly avatar_url: string;
}

/** GitHub Repository (REST API レスポンス) */
interface GitHubRepository {
  readonly full_name: string;
  readonly private: boolean;
  readonly has_issues: boolean;
}
```

---

## 3. 認証関連型

```typescript
// apps/spa/src/types/auth.ts

/** ユーザー情報 (SPA 内部表現) */
interface AuthUser {
  readonly login: string; // GitHub ユーザー名
  readonly id: number; // GitHub ユーザー ID
  readonly avatarUrl: string; // アバター URL
}
```

---

## 4. localStorage スキーマ

| キー                   | 値の型   | 説明                         | 設定タイミング      |
| ---------------------- | -------- | ---------------------------- | ------------------- |
| `ato:token`            | `string` | GitHub access_token          | OAuth 認証成功時    |
| `ato:user`             | `JSON`   | AuthUser のキャッシュ (任意) | ユーザー情報取得時  |
| `ato:repo-initialized` | `"true"` | リポジトリ存在確認済みフラグ | リポ確認/作成成功時 |

ログアウト時は上記 3 キーを全て削除する。

---

## 5. リポジトリ自動作成

### 5.1 概要

ユーザーが初めて TODO 操作を行う際、`ato-datastore` リポジトリが存在しない場合は SPA が自動作成する。

### 5.2 フロー

```
認証済みリクエスト (SPA -> GitHub API)
  |
  v
localStorage "ato:repo-initialized" を確認
  |
  +-- "true" --> そのまま処理続行
  |
  +-- 未設定 --> GitHub API で確認
       |
       +-- GET /repos/{login}/ato-datastore
       |
       +-- 200 (存在する) --> localStorage にキャッシュ --> 処理続行
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
            +-- 201 --> localStorage にキャッシュ --> 処理続行
            +-- 422 (既存) --> 成功として扱い、キャッシュ
            +-- その他エラー --> エラー表示
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
SPA は GitHub API レスポンスの `X-RateLimit-Remaining` ヘッダーを読み取り、残り少ない場合に警告を表示する。

---

## 7. ページネーション

GitHub Issues API はページベースのページネーション (`Link` ヘッダー) を採用。
SPA が `Link` ヘッダーを解析し、次ページの有無と番号を取得する。

```
GitHub Link ヘッダー:
  <...?page=2>; rel="next", <...?page=5>; rel="last"

SPA が解析:
  hasNextPage: true
  nextPage: 2
```

TanStack Query の `useInfiniteQuery` と組み合わせ、
`getNextPageParam` で次ページ番号を返すことで「Load more」ボタンを実現する。
