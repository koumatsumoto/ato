# 03. OAuth Proxy 設計 (Cloudflare Workers)

## 概要

OAuth Proxy の唯一の目的は、GitHub App の `client_secret` を安全に保持し、
認可コード (code) を access_token に交換すること。

フレームワーク不使用。Web 標準 API (Request/Response) のみで実装する。
実装コード量: 約 150 行（ヘルパー関数・セキュリティヘッダー含む）。

> 移行の背景と詳細は [11-github-app-migration.md](./11-github-app-migration.md) を参照。

---

## エンドポイント

### GET /auth/login

OAuth フローを開始する。state を生成し HttpOnly Cookie に保存した上で、GitHub OAuth 認可画面へリダイレクトする。

**処理:**

1. `crypto.randomUUID()` で state を生成
2. state を HttpOnly Cookie に保存 (10 分有効)
3. GitHub OAuth authorize URL へ 302 リダイレクト

**リダイレクト先:**

```text
https://github.com/login/oauth/authorize
  ?client_id={GITHUB_CLIENT_ID}
  &redirect_uri={OAUTH_PROXY_ORIGIN}/auth/callback
  &state={state}
```

GitHub App では `scope` パラメータは不要。権限は App 登録時に定義済み。

**Cookie:**

```text
Set-Cookie: oauth_state={state}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/
```

---

### GET /auth/callback

GitHub からのコールバックを処理し、access_token を SPA に返却する。

**Query (GitHub から):**

| パラメータ | 型     | 必須 | 説明              |
| ---------- | ------ | ---- | ----------------- |
| `code`     | string | Yes  | 一時認可コード    |
| `state`    | string | Yes  | CSRF 保護用 state |

**処理:**

1. Cookie から `oauth_state` を読み取り、query の `state` と比較検証
2. Cookie を即座にクリア (ワンタイム使用)
3. code を GitHub API で access_token に交換
4. postMessage で access_token を SPA に返却する HTML を返す

**GitHub API 呼び出し:**

```text
POST https://github.com/login/oauth/access_token
Headers: Accept: application/json, Content-Type: application/json
Body: { client_id, client_secret, code }
```

**成功レスポンス (HTML):**

```html
<!doctype html>
<html>
  <body>
    <p>Logging in...</p>
    <script>
      if (window.opener) {
        window.opener.postMessage({ type: "ato:auth:success", accessToken: "{access_token}" }, "{SPA_ORIGIN}");
      }
      window.close();
    </script>
  </body>
</html>
```

**エラー時の postMessage:**

| 条件                | postMessage type                                      |
| ------------------- | ----------------------------------------------------- |
| code/state 欠落     | `ato:auth:error` `{ error: "missing_params" }`        |
| state 不正/期限切れ | `ato:auth:error` `{ error: "invalid_state" }`         |
| token 交換失敗      | `ato:auth:error` `{ error: "token_exchange_failed" }` |

---

### GET /auth/health

ヘルスチェック。`200 OK` を返す。

---

## 実装スケッチ

```typescript
interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  SPA_ORIGIN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: { ...corsHeaders(env.SPA_ORIGIN), ...securityHeaders() },
      });
    }

    if (url.pathname === "/auth/login" && request.method === "GET") {
      return handleLogin(url, env);
    }

    if (url.pathname === "/auth/callback" && request.method === "GET") {
      return handleCallback(url, request, env);
    }

    if (url.pathname === "/auth/health") {
      return new Response("OK", { status: 200, headers: securityHeaders() });
    }

    return new Response("Not Found", { status: 404, headers: securityHeaders() });
  },
} satisfies ExportedHandler<Env>;

function handleLogin(url: URL, env: Env): Response {
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `${url.origin}/auth/callback`,
    state,
    // GitHub App では scope パラメータ不要
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://github.com/login/oauth/authorize?${params}`,
      "Set-Cookie": `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/`,
      ...securityHeaders(),
    },
  });
}

async function handleCallback(url: URL, request: Request, env: Env): Promise<Response> {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const clearCookie = { "Set-Cookie": clearCookieHeader() };

  if (!code || !state) {
    return postMessageResponse(env.SPA_ORIGIN, { type: "ato:auth:error", error: "missing_params" }, clearCookie);
  }

  const cookies = parseCookies(request.headers.get("Cookie") ?? "");
  if (cookies["oauth_state"] !== state) {
    return postMessageResponse(env.SPA_ORIGIN, { type: "ato:auth:error", error: "invalid_state" }, clearCookie);
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData: { access_token?: string } = await tokenRes.json();
    if (!tokenData.access_token) {
      return postMessageResponse(env.SPA_ORIGIN, { type: "ato:auth:error", error: "token_exchange_failed" }, clearCookie);
    }

    return postMessageResponse(env.SPA_ORIGIN, { type: "ato:auth:success", accessToken: tokenData.access_token }, clearCookie);
  } catch {
    return postMessageResponse(env.SPA_ORIGIN, { type: "ato:auth:error", error: "token_exchange_failed" }, clearCookie);
  }
}
```

---

## CORS 設定

OAuth Proxy は SPA からの直接 fetch 呼び出しを受けないため、CORS は最小限。
postMessage は HTML レスポンス経由のため CORS 不要だが、将来的な拡張に備えて設定しておく。

```typescript
function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "3600",
  };
}
```

---

## 環境変数

| 変数名                 | 説明                                    | 必須 | 例                       |
| ---------------------- | --------------------------------------- | ---- | ------------------------ |
| `GITHUB_CLIENT_ID`     | GitHub App Client ID                    | Yes  | `Iv23li.abc123...`       |
| `GITHUB_CLIENT_SECRET` | GitHub App Client Secret                | Yes  | `secret_...`             |
| `SPA_ORIGIN`           | SPA のオリジン (postMessage ターゲット) | Yes  | `https://user.github.io` |

環境変数は Cloudflare Dashboard または `wrangler secret put` で設定する。
ローカル開発時は `.dev.vars` ファイルを使用。

---

## ファイル構成

```text
apps/oauth-proxy/
  src/
    index.ts              # Worker エントリポイント (全実装)
  wrangler.toml           # Cloudflare Workers 設定
  .dev.vars               # ローカル開発用環境変数 (.gitignore 対象)
  package.json            # wrangler devDependency のみ
  tsconfig.json           # TypeScript 設定
```

### wrangler.toml

```toml
name = "ato-oauth"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[vars]
SPA_ORIGIN = "https://koumatsumoto.github.io"
```

### .dev.vars

```text
GITHUB_CLIENT_ID=your_dev_client_id
GITHUB_CLIENT_SECRET=your_dev_client_secret
SPA_ORIGIN=http://localhost:5173
```

---

## GitHub App パーミッション

| Permission | Access       | 必要理由                                     |
| ---------- | ------------ | -------------------------------------------- |
| Issues     | Read & Write | TODO の CRUD 操作 (Issue の作成・更新・取得) |
| Metadata   | Read-only    | 自動付与。リポジトリ存在確認に使用           |

GitHub App では OAuth App の `scope` に代わり、App 登録時に細粒度パーミッションを定義する。
`scope` パラメータは認可 URL に含めない。
トークン有効期限は無効（Expire user authorization tokens: off）のため、リフレッシュは不要。
