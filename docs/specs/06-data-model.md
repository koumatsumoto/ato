# 06. データモデル

## 概要

ATO はアプリ専用 DB を持たず、GitHub Issues を永続化層として利用する。
SPA 内部では `Action` 型を使い、GitHub API 境界で変換する。

---

## 1. Action モデル

### 1.1 SPA 内部型

`apps/spa/src/features/actions/types.ts`

```typescript
interface Action {
  readonly id: number;
  readonly title: string;
  readonly memo: string;
  readonly state: "open" | "closed";
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly closedAt: string | null;
  readonly url: string;
  readonly labels: readonly string[];
}
```

### 1.2 GitHub Issue との対応

| Action      | GitHub Issue    | 備考                |
| ----------- | --------------- | ------------------- |
| `id`        | `number`        | Issue 番号          |
| `title`     | `title`         | 1-256               |
| `memo`      | `body`          | null は空文字へ変換 |
| `state`     | `state`         | `open` / `closed`   |
| `createdAt` | `created_at`    | ISO 8601            |
| `updatedAt` | `updated_at`    | ISO 8601            |
| `closedAt`  | `closed_at`     | null 許容           |
| `url`       | `html_url`      | GitHub Issue URL    |
| `labels`    | `labels[].name` | string 配列に投影   |

---

## 2. 入力型

```typescript
interface CreateActionInput {
  readonly title: string;
  readonly memo?: string;
  readonly labels?: readonly string[];
}

interface UpdateActionInput {
  readonly title?: string;
  readonly memo?: string;
  readonly state?: "open" | "closed";
  readonly state_reason?: "completed" | "reopened" | "not_planned";
  readonly labels?: readonly string[];
}
```

---

## 3. GitHub API レスポンス型

主要型:

- `GitHubIssue`
- `GitHubLabel`
- `GitHubRepository`
- `GitHubSearchResult`

定義: `apps/spa/src/features/actions/types.ts`

---

## 4. localStorage スキーマ

### 4.1 認証関連

| Key                      | 型             | 用途                          |
| ------------------------ | -------------- | ----------------------------- |
| `ato:token`              | string         | access token                  |
| `ato:refresh-token`      | string         | refresh token                 |
| `ato:token-expires-at`   | string(number) | access token 期限 (ms epoch)  |
| `ato:refresh-expires-at` | string(number) | refresh token 期限 (ms epoch) |
| `ato:user`               | string         | 予約キー (現実装では未利用)   |

### 4.2 リポジトリ状態

| Key                    | 型       | 用途                               |
| ---------------------- | -------- | ---------------------------------- |
| `ato:repo-initialized` | `"true"` | `ato-datastore` 存在確認済みフラグ |

### 4.3 下書き・補助情報

| Key prefix          | 型             | 用途                        |
| ------------------- | -------------- | --------------------------- |
| `ato:draft:{id}`    | JSON           | Detail 画面の自動保存下書き |
| `ato:recent-labels` | JSON(string[]) | 最近使ったラベル候補        |

---

## 5. リポジトリ存在チェック

`ensureRepository(login)`:

1. `ato:repo-initialized` が `true` なら終了
2. `GET /repos/{login}/ato-datastore`
3. 200 ならフラグ保存
4. 404 なら `RepoNotConfiguredError`

リポジトリ自動作成は行わない。

---

## 6. ページネーション

open/closed 一覧は Issues API の `Link` ヘッダーを解析し、
`hasNextPage` / `nextPage` を返す。

---

## 7. レート制限

`githubFetch` で以下をレート制限として扱う。

- `429`
- `403` かつ `X-RateLimit-Remaining: 0`

`RateLimitError(resetAt)` を投げて UI 側へ伝播する。
