# 03. BFF API 設計

## 概要

BFF は Deno Deploy 上の薄いプロキシ。GitHub OAuth 認証代行とGitHub Issues API へのプロキシを担う。
フレームワークは Hono v4、セッション管理は Deno KV。

---

## 共通仕様

### ベース URL

- 本番: `https://ato-bff.deno.dev`
- 開発: `http://localhost:8000`

### 認証

TODO 操作の全エンドポイントは `Authorization: Bearer {sessionToken}` ヘッダーが必須。

### レスポンス形式

全エンドポイントは以下のエンベロープを使用:

```typescript
// 成功
{
  "success": true,
  "data": T,
  "meta": { ... }  // ページネーション・レート制限情報 (任意)
}

// エラー
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "ユーザー向けメッセージ"
  }
}
```

### 共通エラーコード

| HTTP | code                   | 発生条件                     |
| ---- | ---------------------- | ---------------------------- |
| 400  | `VALIDATION_ERROR`     | 入力バリデーション失敗       |
| 401  | `UNAUTHORIZED`         | セッション無効・期限切れ     |
| 403  | `FORBIDDEN`            | GitHub 権限不足              |
| 404  | `NOT_FOUND`            | リソースが存在しない         |
| 429  | `RATE_LIMITED`         | GitHub API or BFF レート制限 |
| 502  | `UPSTREAM_ERROR`       | GitHub API 障害              |
| 503  | `REPO_CREATION_FAILED` | リポジトリ自動作成失敗       |

---

## 認証エンドポイント

### GET /auth/login

OAuth フローを開始する。

**Query:**

| パラメータ   | 型     | 必須 | デフォルト        | 説明                     |
| ------------ | ------ | ---- | ----------------- | ------------------------ |
| `spa_origin` | string | No   | 本番 SPA オリジン | postMessage のターゲット |

**レスポンス:** 302 Redirect to GitHub OAuth authorize

**GitHub API:** なし (リダイレクトのみ)

---

### GET /auth/callback

GitHub からのコールバックを処理し、セッションを作成する。

**Query (GitHub から):**

| パラメータ | 型     | 必須 | 説明              |
| ---------- | ------ | ---- | ----------------- |
| `code`     | string | Yes  | 一時認可コード    |
| `state`    | string | Yes  | CSRF 保護用 state |

**レスポンス:** HTML ページ (postMessage でセッショントークンを返却)

**GitHub API 呼び出し:**

1. `POST https://github.com/login/oauth/access_token` -- code を token に交換
2. `GET https://api.github.com/user` -- ユーザー情報取得

**処理:**

1. state を Deno KV で検証、削除
2. code を access_token に交換
3. ユーザー情報を取得
4. セッショントークンを生成 (32 byte hex)
5. Deno KV にセッション保存 (24h TTL)
6. postMessage で SPA にトークンを返却

**エラー:**

| 条件                 | postMessage type                                      |
| -------------------- | ----------------------------------------------------- |
| code/state 欠落      | `ato:auth:error` `{ error: "missing_params" }`        |
| state 不正/期限切れ  | `ato:auth:error` `{ error: "invalid_state" }`         |
| token 交換失敗       | `ato:auth:error` `{ error: "token_exchange_failed" }` |
| ユーザー情報取得失敗 | `ato:auth:error` `{ error: "user_fetch_failed" }`     |

---

### POST /auth/logout

セッションを破棄する。

**Headers:** `Authorization: Bearer {sessionToken}`

**レスポンス:**

```json
{ "success": true }
```

**処理:** Deno KV からセッションエントリを削除

---

### GET /auth/me

現在認証中のユーザー情報を返す。

**Headers:** `Authorization: Bearer {sessionToken}`

**レスポンス:**

```json
{
  "success": true,
  "data": {
    "login": "octocat",
    "id": 1,
    "avatarUrl": "https://avatars.githubusercontent.com/u/1?v=4"
  }
}
```

**GitHub API:** `GET https://api.github.com/user`

**キャッシュ:** Deno KV `["user_cache", login]` に 5 分キャッシュ

---

## TODO エンドポイント

全 TODO エンドポイントは認証必須。リポジトリ初期化ミドルウェアを通過する。

---

### GET /todos

TODO 一覧を取得する。

**Headers:** `Authorization: Bearer {sessionToken}`

**Query:**

| パラメータ  | 型                         | 必須 | デフォルト  | 説明                    |
| ----------- | -------------------------- | ---- | ----------- | ----------------------- |
| `state`     | `"open"` \| `"closed"`     | No   | `"open"`    | フィルター              |
| `limit`     | number (1-100)             | No   | `30`        | 取得件数                |
| `cursor`    | string                     | No   | なし        | ページカーソル (base64) |
| `sort`      | `"created"` \| `"updated"` | No   | `"updated"` | ソートフィールド        |
| `direction` | `"asc"` \| `"desc"`        | No   | `"desc"`    | ソート方向              |

**バリデーション (zod):**

```typescript
const listTodosQuery = z.object({
  state: z.enum(["open", "closed"]).default("open"),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().optional(),
  sort: z.enum(["created", "updated"]).default("updated"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});
```

**GitHub API:**

```
GET https://api.github.com/repos/{login}/ato-datastore/issues
  ?state={state}
  &per_page={limit}
  &page={decodedCursor || 1}
  &sort={sort}
  &direction={direction}
```

**レスポンス:**

```json
{
  "success": true,
  "data": [
    {
      "id": 42,
      "title": "Buy groceries",
      "body": "Milk, eggs, bread",
      "state": "open",
      "createdAt": "2026-02-07T10:00:00Z",
      "updatedAt": "2026-02-07T10:00:00Z",
      "closedAt": null,
      "url": "https://github.com/octocat/ato-datastore/issues/42"
    }
  ],
  "meta": {
    "hasNextPage": true,
    "nextCursor": "Mg==",
    "rateLimit": {
      "remaining": 4985,
      "resetAt": "2026-02-07T11:00:00Z"
    }
  }
}
```

**注意:** GitHub Issues API は Pull Request も返す。`pull_request` フィールドが存在するエントリはフィルタして除外する。

---

### POST /todos

TODO を新規作成する。

**Headers:** `Authorization: Bearer {sessionToken}`, `Content-Type: application/json`

**Body:**

```json
{
  "title": "Buy groceries",
  "body": "Milk, eggs, bread"
}
```

**バリデーション (zod):**

```typescript
const createTodoBody = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(256, "Title must be 256 characters or less"),
  body: z
    .string()
    .max(65536, "Body must be 65536 characters or less")
    .optional(),
});
```

**GitHub API:**

```
POST https://api.github.com/repos/{login}/ato-datastore/issues
Body: { "title": "Buy groceries", "body": "Milk, eggs, bread" }
```

**レスポンス (201):**

```json
{
  "success": true,
  "data": {
    "id": 43,
    "title": "Buy groceries",
    "body": "Milk, eggs, bread",
    "state": "open",
    "createdAt": "2026-02-07T12:00:00Z",
    "updatedAt": "2026-02-07T12:00:00Z",
    "closedAt": null,
    "url": "https://github.com/octocat/ato-datastore/issues/43"
  }
}
```

**エラー:**

| 条件                | HTTP | code               |
| ------------------- | ---- | ------------------ |
| title 欠落          | 400  | `VALIDATION_ERROR` |
| title 257 文字以上  | 400  | `VALIDATION_ERROR` |
| body 65537 文字以上 | 400  | `VALIDATION_ERROR` |

---

### GET /todos/:id

TODO 詳細を取得する。

**Headers:** `Authorization: Bearer {sessionToken}`

**Path:** `id` -- Issue 番号 (正の整数)

**GitHub API:**

```
GET https://api.github.com/repos/{login}/ato-datastore/issues/{id}
```

**レスポンス:**

```json
{
  "success": true,
  "data": {
    "id": 42,
    "title": "Buy groceries",
    "body": "Milk, eggs, bread",
    "state": "open",
    "createdAt": "2026-02-07T10:00:00Z",
    "updatedAt": "2026-02-07T10:00:00Z",
    "closedAt": null,
    "url": "https://github.com/octocat/ato-datastore/issues/42"
  }
}
```

**エラー:**

| 条件                | HTTP | code               |
| ------------------- | ---- | ------------------ |
| id が正の整数でない | 400  | `VALIDATION_ERROR` |
| Issue が存在しない  | 404  | `NOT_FOUND`        |
| Pull Request である | 404  | `NOT_FOUND`        |

---

### PATCH /todos/:id

TODO のタイトル・詳細メモを更新する。

**Headers:** `Authorization: Bearer {sessionToken}`, `Content-Type: application/json`

**Path:** `id` -- Issue 番号 (正の整数)

**Body:**

```json
{
  "title": "Buy groceries and snacks",
  "body": "Milk, eggs, bread, chips"
}
```

**バリデーション (zod):**

```typescript
const updateTodoBody = z
  .object({
    title: z.string().trim().min(1).max(256).optional(),
    body: z.string().max(65536).optional(),
  })
  .refine((data) => data.title !== undefined || data.body !== undefined, {
    message: "At least one of title or body is required",
  });
```

**GitHub API:**

```
PATCH https://api.github.com/repos/{login}/ato-datastore/issues/{id}
Body: { "title": "...", "body": "..." }
```

**レスポンス:**

```json
{
  "success": true,
  "data": {
    /* 更新後の Todo */
  }
}
```

**エラー:**

| 条件                   | HTTP | code               |
| ---------------------- | ---- | ------------------ |
| title も body も未指定 | 400  | `VALIDATION_ERROR` |
| Issue が存在しない     | 404  | `NOT_FOUND`        |

---

### POST /todos/:id/close

TODO を完了にする (Issue を close)。

**Headers:** `Authorization: Bearer {sessionToken}`

**Path:** `id` -- Issue 番号 (正の整数)

**GitHub API:**

```
PATCH https://api.github.com/repos/{login}/ato-datastore/issues/{id}
Body: { "state": "closed", "state_reason": "completed" }
```

**レスポンス:**

```json
{
  "success": true,
  "data": {
    /* state: "closed" の Todo */
  }
}
```

**特記:** 既に closed の場合は現在の状態をそのまま返す (冪等)。

---

### POST /todos/:id/reopen

TODO を未完了に戻す (Issue を reopen)。

**Headers:** `Authorization: Bearer {sessionToken}`

**Path:** `id` -- Issue 番号 (正の整数)

**GitHub API:**

```
PATCH https://api.github.com/repos/{login}/ato-datastore/issues/{id}
Body: { "state": "open", "state_reason": "reopened" }
```

**レスポンス:**

```json
{
  "success": true,
  "data": {
    /* state: "open" の Todo */
  }
}
```

**特記:** 既に open の場合は現在の状態をそのまま返す (冪等)。

---

## ミドルウェア

### 認証ミドルウェア

全 `/todos/*` と `/auth/me`、`/auth/logout` に適用。

```
Authorization ヘッダーから Bearer トークンを抽出
  -> Deno KV でセッション検索
  -> 見つからない場合 401
  -> スライディング有効期限チェック (残り 12h 未満なら延長)
  -> context に session をセット
```

### リポジトリ初期化ミドルウェア

全 `/todos/*` に適用。

```
Deno KV ["repo_initialized", login] を確認
  -> キャッシュあり -> 通過
  -> キャッシュなし -> GitHub API で確認/作成 -> キャッシュ
```

詳細は [06-data-model.md](./06-data-model.md) セクション 5 を参照。

---

## BFF ファイル構成

```
packages/bff/
  deno.json                    # Deno config, import map, tasks
  src/
    main.ts                    # エントリポイント: Deno.serve(app.fetch)
    app.ts                     # Hono app 組み立て
    config.ts                  # 環境変数、定数
    routes/
      auth.ts                  # /auth/* ルート
      todos.ts                 # /todos/* ルート
    middleware/
      auth.ts                  # セッション認証
      repo-init.ts             # リポジトリ初期化
      error-handler.ts         # グローバルエラーハンドラ
    services/
      github-api.ts            # GitHub API クライアント
      session-store.ts         # Deno KV セッション CRUD
    lib/
      crypto.ts                # トークン生成
      error-mapper.ts          # GitHub エラーマッピング
      issue-mapper.ts          # GitHub Issue -> Todo 変換
      pagination.ts            # Link ヘッダーパース、カーソル変換
      validator.ts             # zod バリデーションヘルパー
    __tests__/
      routes/
        auth.test.ts
        todos.test.ts
      services/
        github-api.test.ts
        session-store.test.ts
      lib/
        issue-mapper.test.ts
        pagination.test.ts
```

---

## 環境変数

| 変数名                 | 説明                       | 必須                          |
| ---------------------- | -------------------------- | ----------------------------- |
| `GITHUB_CLIENT_ID`     | OAuth App Client ID        | Yes                           |
| `GITHUB_CLIENT_SECRET` | OAuth App Client Secret    | Yes                           |
| `SPA_ORIGIN`           | SPA のオリジン (CORS 許可) | Yes                           |
| `BFF_ORIGIN`           | BFF 自身のオリジン         | Yes                           |
| `DATASTORE_REPO_NAME`  | リポジトリ名               | No (default: `ato-datastore`) |
| `SESSION_TTL_HOURS`    | セッション有効期間         | No (default: `24`)            |
