# 04. 認証フロー詳細

## 概要

GitHub OAuth App を使用した認証。SPA と BFF が別オリジンのため、popup + postMessage パターンを採用する。

---

## 1. OAuth フロー シーケンス図

```
SPA (*.github.io)              BFF (*.deno.dev)                 GitHub
     |                              |                              |
     |  (1) window.open             |                              |
     |----> GET /auth/login ------->|                              |
     |      ?spa_origin=...         |                              |
     |                              |  (2) state 生成 + Deno KV 保存
     |                              |                              |
     |                              |  (3) 302 Redirect            |
     |                              |----> github.com/login/ ----->|
     |                              |      oauth/authorize         |
     |                              |      ?client_id=...          |
     |                              |      &redirect_uri=.../callback
     |                              |      &scope=repo             |
     |                              |      &state={random}         |
     |                              |                              |
     |                              |                    ユーザー認可
     |                              |                              |
     |                              |  (4) GitHub redirect         |
     |                              |<---- GET /auth/callback -----|
     |                              |      ?code=...&state=...     |
     |                              |                              |
     |                              |  (5) state 検証 (Deno KV)    |
     |                              |                              |
     |                              |  (6) code -> token 交換      |
     |                              |----> POST .../access_token ->|
     |                              |      { client_id,            |
     |                              |        client_secret, code } |
     |                              |                              |
     |                              |<---- { access_token } -------|
     |                              |                              |
     |                              |  (7) ユーザー情報取得         |
     |                              |----> GET /user ------------->|
     |                              |<---- { login, id, ... } -----|
     |                              |                              |
     |                              |  (8) セッション作成           |
     |                              |      Deno KV に保存           |
     |                              |                              |
     |  (9) HTML + postMessage      |                              |
     |<---- { type, sessionToken } -|                              |
     |                              |                              |
     |  (10) localStorage に保存     |                              |
     |  (11) popup を閉じる          |                              |
```

---

## 2. 各ステップ詳細

### Step 1: SPA がログインを開始

SPA は popup ウィンドウで BFF の `/auth/login` を開く。

```typescript
// SPA 側
function openLoginPopup() {
  const bffUrl = import.meta.env.VITE_BFF_URL;
  const spaOrigin = window.location.origin;
  const url = `${bffUrl}/auth/login?spa_origin=${encodeURIComponent(spaOrigin)}`;

  const popup = window.open(url, "ato-login", "width=600,height=700");

  // postMessage を待機
  const handler = (event: MessageEvent) => {
    if (event.origin !== bffUrl) return;
    if (event.data?.type === "ato:auth:success") {
      localStorage.setItem("ato:session", event.data.sessionToken);
      window.removeEventListener("message", handler);
      popup?.close();
      // 認証状態を更新
    }
    if (event.data?.type === "ato:auth:error") {
      window.removeEventListener("message", handler);
      popup?.close();
      // エラー表示
    }
  };
  window.addEventListener("message", handler);
}
```

### Step 2-3: BFF が state を生成し GitHub へリダイレクト

```typescript
// BFF: GET /auth/login
app.get("/auth/login", async (c) => {
  const spaOrigin = c.req.query("spa_origin") ?? SPA_ORIGIN;
  const state = generateRandomHex(32);

  await kv.set(
    ["oauth_states", state],
    { createdAt: now(), spaOrigin },
    { expireIn: 600_000 },
  );

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: `${BFF_ORIGIN}/auth/callback`,
    scope: "repo",
    state,
  });

  return c.redirect(`https://github.com/login/oauth/authorize?${params}`);
});
```

**OAuth スコープ: `repo`**

- `repo` スコープで private リポジトリの Issue 読み書きが可能
- 他のスコープは不要 (最小権限の原則)

### Step 4-5: コールバックで state を検証

```typescript
// BFF: GET /auth/callback
// 1. state パラメータの検証
const stateEntry = await kv.get(["oauth_states", state]);
if (!stateEntry.value) {
  // 不正な state -> エラー HTML を返却
}
await kv.delete(["oauth_states", state]); // 使い捨て
```

### Step 6: code を access_token に交換

```typescript
// BFF: code -> token 交換
const response = await fetch("https://github.com/login/oauth/access_token", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  body: JSON.stringify({
    client_id: GITHUB_CLIENT_ID,
    client_secret: GITHUB_CLIENT_SECRET,
    code,
    redirect_uri: `${BFF_ORIGIN}/auth/callback`,
  }),
});
const { access_token, token_type, scope } = await response.json();
```

### Step 7: ユーザー情報を取得

```typescript
const userResponse = await fetch("https://api.github.com/user", {
  headers: { Authorization: `Bearer ${access_token}` },
});
const user = await userResponse.json();
```

### Step 8: セッション作成

```typescript
const sessionToken = generateRandomHex(32); // 64 文字の hex

await kv.set(
  ["sessions", sessionToken],
  {
    githubAccessToken: access_token,
    githubLogin: user.login,
    githubId: user.id,
    createdAt: now(),
    expiresAt: addHours(now(), 24),
  },
  { expireIn: 24 * 60 * 60 * 1000 }, // 24 時間
);
```

### Step 9: postMessage で SPA にトークンを返却

```typescript
// BFF: HTML レスポンスを返却
return c.html(`
  <!DOCTYPE html>
  <html>
  <body>
    <p>Logging in...</p>
    <script>
      if (window.opener) {
        window.opener.postMessage(
          { type: "ato:auth:success", sessionToken: "${sessionToken}" },
          "${spaOrigin}"
        );
      }
      window.close();
    </script>
  </body>
  </html>
`);
```

---

## 3. セッション管理

### 3.1 セッショントークン

| 項目         | 仕様                                         |
| ------------ | -------------------------------------------- |
| 形式         | 32 byte ランダム hex (64 文字)               |
| 生成         | `crypto.getRandomValues(new Uint8Array(32))` |
| 保存先 (BFF) | Deno KV `["sessions", token]`                |
| 保存先 (SPA) | `localStorage` key: `"ato:session"`          |
| TTL          | 24 時間                                      |
| 送信方法     | `Authorization: Bearer {token}` ヘッダー     |

### 3.2 スライディング有効期限

セッションの残り時間が 12 時間未満の場合、リクエスト処理時に TTL を 24 時間に延長する。

```typescript
// BFF auth middleware
function shouldExtendSession(session: Session): boolean {
  const remainingMs = new Date(session.expiresAt).getTime() - Date.now();
  return remainingMs < 12 * 60 * 60 * 1000; // 12 時間未満
}

if (shouldExtendSession(session)) {
  const newExpiry = addHours(now(), 24);
  await kv.set(
    ["sessions", token],
    { ...session, expiresAt: newExpiry },
    { expireIn: 24 * 60 * 60 * 1000 },
  );
}
```

### 3.3 トークンリフレッシュ戦略

GitHub OAuth App の access_token はユーザーが明示的に取り消さない限り無期限。
そのため、リフレッシュトークンの仕組みは不要。

セッション期限切れ時:

1. SPA が API 呼び出しで 401 を受信
2. localStorage のトークンをクリア
3. ログイン画面に遷移
4. ユーザーが再ログイン (既に OAuth 認可済みなら GitHub は即座にリダイレクト)

---

## 4. SPA 側の認証状態管理

### 4.1 AuthContext

```typescript
interface AuthState {
  readonly token: string | null;
  readonly user: AuthUser | null;
  readonly isLoading: boolean;
}

// AuthProvider が提供する値
interface AuthContextValue {
  readonly state: AuthState;
  readonly login: () => void; // popup を開く
  readonly logout: () => void; // トークンクリア + BFF logout
}
```

### 4.2 初期化フロー

```
アプリ起動
  |
  v
localStorage から token を読み取り
  |
  +-- token なし --> ログインページ表示
  |
  +-- token あり --> GET /auth/me で検証
       |
       +-- 200 --> 認証済み状態に遷移、メイン画面表示
       +-- 401 --> token をクリア、ログインページ表示
```

### 4.3 全 API リクエストへのトークン付与

```typescript
// api-client.ts
async function fetchWithAuth(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  const token = localStorage.getItem("ato:session");
  if (!token) {
    throw new AuthError("Not authenticated");
  }

  const response = await fetch(`${BFF_URL}${path}`, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    localStorage.removeItem("ato:session");
    // ログイン画面へリダイレクト
    throw new AuthError("Session expired");
  }

  return response;
}
```

---

## 5. CORS 設定

SPA と BFF が別オリジンのため、BFF に CORS 設定が必須。

```typescript
// BFF: CORS middleware (Hono)
import { cors } from "hono/cors";

app.use(
  "/*",
  cors({
    origin: [
      SPA_ORIGIN, // 本番: https://<user>.github.io
      ...(IS_DEV ? ["http://localhost:5173"] : []), // 開発時
    ],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["X-RateLimit-Remaining", "X-RateLimit-Reset"],
    maxAge: 3600,
    credentials: false, // Bearer トークン方式のため不要
  }),
);
```

---

## 6. ログアウト

```
SPA                          BFF
 |                            |
 |-- POST /auth/logout ------>|
 |   Authorization: Bearer    |
 |                            |-- Deno KV からセッション削除
 |<-- 200 { success: true } --|
 |                            |
 |-- localStorage クリア       |
 |-- ログインページへ遷移      |
```

---

## 7. セキュリティ考慮事項

| 脅威                   | 対策                                              |
| ---------------------- | ------------------------------------------------- |
| CSRF (OAuth フロー)    | `state` パラメータ + Deno KV で検証               |
| トークン漏洩 (XSS)     | localStorage 保存のリスクあり。CSP ヘッダーで軽減 |
| postMessage なりすまし | オリジン検証 (`event.origin` チェック)            |
| セッションハイジャック | オペークトークン (推測不可能な 32 byte hex)       |
| GitHub token 漏洩      | BFF 内でのみ保持。SPA には露出しない              |

---

## 8. 開発環境での認証

開発時は Vite の proxy 機能により同一オリジンで動作するため、CORS の問題は発生しない。

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      "/auth": "http://localhost:8000",
      "/todos": "http://localhost:8000",
    },
  },
});
```

ただし OAuth のコールバック URL は BFF のオリジン (`http://localhost:8000`) に設定する必要がある。
GitHub OAuth App の設定で `Authorization callback URL` に `http://localhost:8000/auth/callback` を登録する。
