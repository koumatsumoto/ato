# 08. セキュリティ

## 概要

個人利用のメモアプリだが、GitHub アクセストークンを扱うため適切なセキュリティ対策が必要。
access_token は SPA の localStorage に保存する設計であり、XSS リスクを認識した上で CSP 等で軽減する。

---

## 1. トークン管理

### 1.1 GitHub Access Token

| 項目         | 方針                                                   |
| ------------ | ------------------------------------------------------ |
| 保存場所     | SPA の `localStorage` key: `"ato:token"`               |
| 用途         | SPA -> GitHub API 呼び出し時の Authorization ヘッダー  |
| 有効期限     | OAuth App のため無期限 (ユーザーが取り消すまで)        |
| 取り消し方法 | GitHub Settings > Applications > Authorized OAuth Apps |

### 1.2 リスク: localStorage と XSS

localStorage は XSS 攻撃で読み取られる可能性がある。
access_token が漏洩した場合、攻撃者は `repo` スコープの権限で GitHub API にアクセスできる。

**リスク受容の根拠:**

- 個人利用アプリであり、攻撃対象になりにくい
- 厳格な CSP で外部スクリプトを完全に遮断
- React の自動エスケープにより XSS リスクが極めて低い
- SPA は外部スクリプトを一切読み込まない
- `dangerouslySetInnerHTML` を使用しない

**代替案との比較:**

| 方式                  | セキュリティ | 複雑性 | 備考                               |
| --------------------- | ------------ | ------ | ---------------------------------- |
| BFF + httpOnly Cookie | 高           | 高     | サーバーサイドセッション管理が必要 |
| localStorage (採用)   | 中           | 低     | XSS リスクあり、CSP で軽減         |
| メモリ内のみ (非永続) | 高           | 中     | ページリロードで再認証が必要       |

---

## 2. CSRF 対策

### 2.1 OAuth フロー

OAuth の `state` パラメータで CSRF を防止。

```text
1. OAuth Proxy: crypto.randomUUID() で state を生成
2. OAuth Proxy: HttpOnly Cookie に保存 (Secure; SameSite=Lax; 10 分 TTL)
3. OAuth Proxy: state を GitHub OAuth URL に含めてリダイレクト
4. OAuth Proxy: callback で Cookie の state と query の state を比較検証
```

HttpOnly Cookie を使用するため、JavaScript からの読み取りは不可。
SameSite=Lax により、同一オリジンからのリクエストでのみ Cookie が送信される。

### 2.2 GitHub API リクエスト

SPA は `Authorization: Bearer {token}` ヘッダーで GitHub API を呼び出す。
Bearer トークンはブラウザの自動付与対象ではないため、外部サイトからの偽装リクエストは成立しない。

---

## 3. postMessage セキュリティ

### 3.1 OAuth Proxy 側 (送信)

```typescript
// postMessage のターゲットオリジンを明示的に指定
window.opener.postMessage(
  { type: "ato:auth:success", accessToken },
  "${SPA_ORIGIN}", // ワイルドカード "*" は使わない
);
```

### 3.2 SPA 側 (受信)

```typescript
window.addEventListener("message", (event) => {
  // オリジン検証
  if (event.origin !== OAUTH_PROXY_ORIGIN) return;

  // type 検証
  if (event.data?.type !== "ato:auth:success" && event.data?.type !== "ato:auth:error") return;

  // 処理...
});
```

**重要:** postMessage で access_token を送信するため、オリジン検証は必須。
`"*"` を使用すると、悪意のあるサイトがトークンを傍受できる。

---

## 4. 入力バリデーション

### 4.1 SPA 側 (zod)

SPA はユーザー入力を zod で検証してから GitHub API に送信する。
GitHub API 自体もバリデーションを行うため、二重の保護となる。

```typescript
// TODO 作成
const createTodoSchema = z.object({
  title: z.string().trim().min(1).max(256),
  body: z.string().max(65536).optional(),
});

// TODO 更新
const updateTodoSchema = z
  .object({
    title: z.string().trim().min(1).max(256).optional(),
    body: z.string().max(65536).optional(),
  })
  .refine((data) => data.title !== undefined || data.body !== undefined);
```

---

## 5. XSS 対策

### 5.1 プレーンテキスト表示

詳細メモはプレーンテキストのみ。Markdown レンダリングは行わない。

SPA 側で `dangerouslySetInnerHTML` は一切使用しない。
React のデフォルト動作 (JSX 内のテキストは自動エスケープ) を活用。

```typescript
// OK: React が自動エスケープ
<p>{todo.body}</p>

// NG: 絶対に使わない
<p dangerouslySetInnerHTML={{ __html: todo.body }} />
```

### 5.2 CSP (Content Security Policy)

GitHub Pages の `<meta>` タグで設定。

```html
<meta
  http-equiv="Content-Security-Policy"
  content="
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' https://avatars.githubusercontent.com;
  connect-src 'self' https://api.github.com https://ato-oauth.{user}.workers.dev;
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
| `connect-src`  | `'self' https://api.github.com https://...`    | GitHub API + OAuth Proxy への接続    |
| `frame-src`    | `'none'`                                       | iframe 埋め込み禁止                  |
| `object-src`   | `'none'`                                       | プラグイン禁止                       |

---

## 6. OAuth Proxy セキュリティ

### 6.1 client_secret の保護

`client_secret` は Cloudflare Workers の環境変数として設定し、ソースコードに含めない。
ローカル開発時は `.dev.vars` ファイルを使用 (.gitignore 対象)。

### 6.2 セキュリティヘッダー

OAuth Proxy のレスポンスに付与:

```typescript
{
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
}
```

### 6.3 CORS

OAuth Proxy は SPA オリジンのみを許可。`"*"` は使用しない。

---

## 7. OAuth スコープ

| スコープ | 必要理由                            | 権限                       |
| -------- | ----------------------------------- | -------------------------- |
| `repo`   | private リポジトリの Issue 読み書き | リポジトリ全体へのアクセス |

`repo` スコープは広いが、GitHub OAuth App では Issue のみの権限分離ができない。
このリスクは以下で軽減:

- SPA はコード上で `ato-datastore` リポジトリのみにアクセス制限
- CSP で外部スクリプトを遮断し、token 漏洩リスクを最小化
- ユーザーは GitHub Settings からいつでもトークンを取り消し可能

---

## 8. トークン取り消し

ユーザーがトークンを取り消す手順:

1. GitHub Settings > Applications > Authorized OAuth Apps
2. ATO アプリを選択
3. "Revoke access" をクリック

取り消し後、SPA は次回の GitHub API 呼び出しで 401 を受信し、自動的にログアウトする。

---

## 9. セキュリティチェックリスト

### コミット前チェック

- [ ] ハードコードされた秘密情報がない (API キー、トークン、パスワード)
- [ ] `.dev.vars` が `.gitignore` に含まれている
- [ ] `dangerouslySetInnerHTML` を使用していない
- [ ] 全ユーザー入力が zod でバリデーションされている
- [ ] postMessage のオリジン検証がある
- [ ] CSP ヘッダーが設定されている

### デプロイ前チェック

- [ ] GitHub OAuth App の設定が正しい (callback URL)
- [ ] Cloudflare Workers の環境変数が設定されている (client_secret 等)
- [ ] SPA の OAuth Proxy URL が本番を指している
- [ ] CSP の `connect-src` が本番 URL を許可している
