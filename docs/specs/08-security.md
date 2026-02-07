# 08. セキュリティ

## 概要

個人利用の TODO アプリだが、GitHub アクセストークンを扱うため適切なセキュリティ対策が必要。
「BFF にトークンを閉じ込める」設計を基本とし、SPA には最小限の情報のみ露出する。

---

## 1. トークン管理

### 1.1 GitHub Access Token

| 項目         | 方針                                                  |
| ------------ | ----------------------------------------------------- |
| 保存場所     | BFF の Deno KV のみ                                   |
| SPA への露出 | なし (一切返さない)                                   |
| 用途         | BFF -> GitHub API 呼び出し時の Authorization ヘッダー |
| 有効期限     | OAuth App のため無期限 (ユーザーが取り消すまで)       |

### 1.2 セッショントークン

| 項目       | 方針                                         |
| ---------- | -------------------------------------------- |
| 形式       | 32 byte ランダム hex (64 文字)               |
| 生成       | `crypto.getRandomValues(new Uint8Array(32))` |
| SPA 保存先 | `localStorage` key: `"ato:session"`          |
| BFF 保存先 | Deno KV `["sessions", token]` (24h TTL)      |
| 送信方法   | `Authorization: Bearer {token}` ヘッダー     |

### 1.3 リスク: localStorage と XSS

localStorage は XSS 攻撃で読み取られる可能性がある。
セッショントークンが漏洩しても、直接 GitHub にアクセスすることはできない (BFF 経由のみ)。

**軽減策:**

- CSP ヘッダー (後述)
- セッションの有効期限制限 (24h)
- SPA は外部スクリプトを読み込まない

---

## 2. CORS

### 2.1 設定

```typescript
app.use(
  "/*",
  cors({
    origin: [SPA_ORIGIN], // 明示的なオリジンのみ
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: [
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
      "Retry-After",
    ],
    maxAge: 3600,
    credentials: false,
  }),
);
```

### 2.2 ポイント

- `origin: "*"` は使用しない。明示的なオリジンリストのみ
- `credentials: false` (Bearer トークン方式のため Cookie 不要)
- 開発時は `http://localhost:5173` を追加

---

## 3. CSRF 対策

### 3.1 OAuth フロー

OAuth の `state` パラメータで CSRF を防止。

```
1. BFF: 32 byte ランダム state を生成
2. BFF: Deno KV に保存 (10 分 TTL)
3. BFF: state を GitHub OAuth URL に含めてリダイレクト
4. BFF: callback で state を検証、使用後に Deno KV から削除 (ワンタイム)
```

### 3.2 API リクエスト

Bearer トークン方式のため、Cookie ベースの CSRF リスクは存在しない。
`Authorization` ヘッダーはブラウザの自動付与対象ではないため、外部サイトからの偽装リクエストは成立しない。

---

## 4. postMessage セキュリティ

### 4.1 BFF 側 (送信)

```typescript
// postMessage のターゲットオリジンを明示的に指定
window.opener.postMessage(
  { type: "ato:auth:success", sessionToken },
  "${spaOrigin}", // ワイルドカード "*" は使わない
);
```

### 4.2 SPA 側 (受信)

```typescript
window.addEventListener("message", (event) => {
  // オリジン検証
  if (event.origin !== BFF_ORIGIN) return;

  // type 検証
  if (
    event.data?.type !== "ato:auth:success" &&
    event.data?.type !== "ato:auth:error"
  )
    return;

  // 処理...
});
```

---

## 5. 入力バリデーション

### 5.1 BFF 側 (zod)

全入力を BFF で検証。SPA のバリデーションは UX 向上のためのものであり、セキュリティの境界ではない。

```typescript
// TODO 作成
const createTodoBody = z.object({
  title: z.string().trim().min(1).max(256),
  body: z.string().max(65536).optional(),
});

// TODO 更新
const updateTodoBody = z
  .object({
    title: z.string().trim().min(1).max(256).optional(),
    body: z.string().max(65536).optional(),
  })
  .refine((data) => data.title !== undefined || data.body !== undefined);

// クエリパラメータ
const listTodosQuery = z.object({
  state: z.enum(["open", "closed"]).default("open"),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().optional(),
  sort: z.enum(["created", "updated"]).default("updated"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

// パスパラメータ
const todoIdParam = z.coerce.number().int().positive();
```

### 5.2 リクエストボディサイズ制限

```typescript
// Hono middleware
app.use("/*", bodyLimit({ maxSize: 100 * 1024 })); // 100KB
```

### 5.3 Content-Type 検証

POST/PATCH リクエストは `Content-Type: application/json` のみ許可。

```typescript
app.use("/todos/*", async (c, next) => {
  if (["POST", "PATCH"].includes(c.req.method)) {
    const contentType = c.req.header("Content-Type");
    if (!contentType?.includes("application/json")) {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Content-Type must be application/json",
          },
        },
        415,
      );
    }
  }
  await next();
});
```

---

## 6. XSS 対策

### 6.1 プレーンテキスト表示

詳細メモはプレーンテキストのみ。Markdown レンダリングは行わない。

SPA 側で `dangerouslySetInnerHTML` は一切使用しない。
React のデフォルト動作 (JSX 内のテキストは自動エスケープ) を活用。

```typescript
// OK: React が自動エスケープ
<p>{todo.body}</p>

// NG: 絶対に使わない
<p dangerouslySetInnerHTML={{ __html: todo.body }} />
```

### 6.2 CSP (Content Security Policy)

GitHub Pages の `_headers` ファイル、または `<meta>` タグで設定。

```html
<meta
  http-equiv="Content-Security-Policy"
  content="
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' https://avatars.githubusercontent.com;
  connect-src 'self' https://ato-bff.deno.dev;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
"
/>
```

| ディレクティブ | 値                                             | 理由                                 |
| -------------- | ---------------------------------------------- | ------------------------------------ |
| `default-src`  | `'self'`                                       | 基本は自ドメインのみ                 |
| `script-src`   | `'self'`                                       | 外部スクリプト禁止                   |
| `style-src`    | `'self' 'unsafe-inline'`                       | TailwindCSS のインラインスタイル許可 |
| `img-src`      | `'self' https://avatars.githubusercontent.com` | GitHub アバター                      |
| `connect-src`  | `'self' https://ato-bff.deno.dev`              | BFF への API 呼び出し                |
| `frame-src`    | `'none'`                                       | iframe 埋め込み禁止                  |
| `object-src`   | `'none'`                                       | プラグイン禁止                       |

---

## 7. OAuth スコープ最小化

| スコープ | 必要理由                            | 権限                       |
| -------- | ----------------------------------- | -------------------------- |
| `repo`   | private リポジトリの Issue 読み書き | リポジトリ全体へのアクセス |

`repo` スコープは広いが、GitHub OAuth App では Issue のみの権限分離ができない。
このリスクは以下で軽減:

- access_token はクライアントに露出しない (BFF のみ)
- BFF は `ato-datastore` リポジトリのみにアクセス (コード上で制限)
- セッションは 24h で失効

---

## 8. BFF セキュリティヘッダー

```typescript
app.use("/*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
});
```

---

## 9. ログの安全性

### 禁止事項

ログに以下を出力しない:

- GitHub access_token
- セッショントークン
- OAuth client_secret
- OAuth authorization code

### 許可事項

ログに出力してよい:

- リクエストメソッド、パス
- HTTP ステータスコード
- GitHub ユーザー名 (login)
- エラーコード、エラーメッセージ
- レート制限の残り回数

---

## 10. セキュリティチェックリスト

### コミット前チェック

- [ ] ハードコードされた秘密情報がない (API キー、トークン、パスワード)
- [ ] 環境変数が `.env` ファイルに定義されている
- [ ] `.env` が `.gitignore` に含まれている
- [ ] `dangerouslySetInnerHTML` を使用していない
- [ ] 全ユーザー入力が BFF で zod バリデーションされている
- [ ] CORS が明示的なオリジンリストに制限されている
- [ ] postMessage のオリジン検証がある
- [ ] ログに秘密情報が含まれていない
- [ ] CSP ヘッダーが設定されている

### デプロイ前チェック

- [ ] GitHub OAuth App の設定が正しい (callback URL)
- [ ] Deno Deploy の環境変数が設定されている
- [ ] SPA の BFF URL が本番を指している
- [ ] CORS のオリジンが本番 SPA を許可している
