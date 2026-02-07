# 04. 認証フロー詳細

## 概要

GitHub OAuth App を使用した認証。SPA と OAuth Proxy が別オリジンのため、popup + postMessage パターンを採用する。
access_token は SPA の localStorage に保存し、SPA から GitHub API を直接呼び出す。

---

## 1. OAuth フロー シーケンス図

```
SPA (*.github.io)              OAuth Proxy (CF Workers)         GitHub
     |                              |                              |
     |  (1) window.open             |                              |
     |----> GET /auth/login ------->|                              |
     |                              |                              |
     |                              |  (2) state 生成              |
     |                              |  HttpOnly Cookie に保存      |
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
     |                              |  (5) Cookie の state 検証     |
     |                              |                              |
     |                              |  (6) code -> token 交換      |
     |                              |----> POST .../access_token ->|
     |                              |      { client_id,            |
     |                              |        client_secret, code } |
     |                              |                              |
     |                              |<---- { access_token } -------|
     |                              |                              |
     |  (7) HTML + postMessage      |                              |
     |<---- { type, accessToken } --|                              |
     |                              |                              |
     |  (8) localStorage に保存     |                              |
     |  (9) popup を閉じる          |                              |
```

---

## 2. 各ステップ詳細

### Step 1: SPA がログインを開始

SPA は popup ウィンドウで OAuth Proxy の `/auth/login` を開く。

```typescript
// SPA 側
function openLoginPopup() {
  const proxyUrl = import.meta.env.VITE_OAUTH_PROXY_URL;
  const url = `${proxyUrl}/auth/login`;

  const popup = window.open(url, "ato-login", "width=600,height=700");

  // postMessage を待機
  const handler = (event: MessageEvent) => {
    if (event.origin !== proxyUrl) return;
    if (event.data?.type === "ato:auth:success") {
      localStorage.setItem("ato:token", event.data.accessToken);
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

### Step 2-3: OAuth Proxy が state を生成し GitHub へリダイレクト

```typescript
// OAuth Proxy: GET /auth/login
function handleLogin(url: URL, env: Env): Response {
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `${url.origin}/auth/callback`,
    scope: "repo",
    state,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://github.com/login/oauth/authorize?${params}`,
      "Set-Cookie": `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/`,
    },
  });
}
```

**OAuth スコープ: `repo`**

- `repo` スコープで private リポジトリの Issue 読み書きが可能
- 他のスコープは不要 (最小権限の原則)

### Step 4-5: コールバックで state を検証

```typescript
// OAuth Proxy: GET /auth/callback
// Cookie から state を読み取り、query の state と比較
const cookies = parseCookies(request.headers.get("Cookie") ?? "");
if (cookies.oauth_state !== state) {
  return postMessageResponse(env.SPA_ORIGIN, {
    type: "ato:auth:error",
    error: "invalid_state",
  });
}
// Cookie をクリア (ワンタイム使用)
```

### Step 6: code を access_token に交換

```typescript
// OAuth Proxy: code -> token 交換
const response = await fetch("https://github.com/login/oauth/access_token", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  body: JSON.stringify({
    client_id: env.GITHUB_CLIENT_ID,
    client_secret: env.GITHUB_CLIENT_SECRET,
    code,
  }),
});
const { access_token } = await response.json();
```

### Step 7: postMessage で SPA に access_token を返却

```typescript
// OAuth Proxy: HTML レスポンスを返却
return new Response(
  `<!DOCTYPE html>
  <html>
  <body>
    <p>Logging in...</p>
    <script>
      if (window.opener) {
        window.opener.postMessage(
          { type: "ato:auth:success", accessToken: "${access_token}" },
          "${env.SPA_ORIGIN}"
        );
      }
      window.close();
    </script>
  </body>
  </html>`,
  { headers: { "Content-Type": "text/html" } },
);
```

---

## 3. トークンライフサイクル

### 3.1 トークン仕様

| 項目       | 仕様                                                     |
| ---------- | -------------------------------------------------------- |
| 形式       | GitHub が発行する `gho_` プレフィックスの access_token   |
| SPA 保存先 | `localStorage` key: `"ato:token"`                        |
| 送信方法   | GitHub API への `Authorization: Bearer {token}` ヘッダー |
| 有効期限   | 無期限 (OAuth App のため。ユーザーが取り消すまで有効)    |

### 3.2 トークン無効化の検知

GitHub API が 401 を返した場合、token が取り消されたと判断する。

```
SPA: GitHub API 呼び出し
  -> 401 Unauthorized
  -> localStorage から token をクリア
  -> ログイン画面へ遷移
  -> ユーザーが再ログイン (既に OAuth 認可済みなら GitHub は即座にリダイレクト)
```

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
  readonly logout: () => void; // token クリア (クライアント側のみ)
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
  +-- token あり --> GET https://api.github.com/user で検証
       |
       +-- 200 --> 認証済み状態に遷移、メイン画面表示
       +-- 401 --> token をクリア、ログインページ表示
```

### 4.3 GitHub API リクエストへのトークン付与

```typescript
// shared/lib/github-client.ts
const GITHUB_API = "https://api.github.com";

async function githubFetch(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  const token = localStorage.getItem("ato:token");
  if (!token) {
    throw new AuthError("Not authenticated");
  }

  const response = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (response.status === 401) {
    localStorage.removeItem("ato:token");
    throw new AuthError("Token expired or revoked");
  }

  return response;
}
```

---

## 5. ログアウト

ログアウトは完全にクライアント側で完結する。サーバー呼び出しは不要。

```
SPA:
  1. localStorage から "ato:token" を削除
  2. localStorage から "ato:user" を削除 (キャッシュ)
  3. localStorage から "ato:repo-initialized" を削除
  4. TanStack Query のキャッシュをクリア
  5. ログインページへ遷移
```

---

## 6. セキュリティ考慮事項

| 脅威                   | 対策                                             |
| ---------------------- | ------------------------------------------------ |
| CSRF (OAuth フロー)    | `state` パラメータ + HttpOnly Cookie で検証      |
| トークン漏洩 (XSS)     | CSP ヘッダーで軽減。localStorage のリスクは許容  |
| postMessage なりすまし | オリジン検証 (`event.origin` チェック)           |
| token 窃取             | access_token は localStorage に保存 (XSS リスク) |

詳細は [08-security.md](./08-security.md) を参照。

---

## 7. 開発環境での認証

開発時は OAuth Proxy をローカルで起動 (`npx wrangler dev`) する。
SPA の Vite proxy で `/auth` を OAuth Proxy に転送。

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      "/auth": "http://localhost:8787", // wrangler dev のデフォルトポート
    },
  },
});
```

GitHub OAuth App の設定で `Authorization callback URL` に `http://localhost:8787/auth/callback` を登録する。
