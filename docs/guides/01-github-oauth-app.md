# GitHub OAuth App 作成

## 概要

ATO は GitHub OAuth App を使って認証する。開発用と本番用の 2 つを作成する。

---

## 手順

### 1. OAuth App 作成画面を開く

GitHub > Settings > Developer settings > OAuth Apps > "New OAuth App"

### 2. 開発用 OAuth App を作成

| 項目                       | 値                                    |
| -------------------------- | ------------------------------------- |
| Application name           | `ATO (dev)`                           |
| Homepage URL               | `http://localhost:5173`               |
| Authorization callback URL | `http://localhost:8787/auth/callback` |

"Register application" をクリック。

### 3. Client Secret を生成

- "Generate a new client secret" をクリック
- Client ID と Client Secret を控える（Secret は再表示不可）

### 4. 開発用の認証情報をローカルに保存

`apps/oauth-proxy/.dev.vars` を作成:

```ini
GITHUB_CLIENT_ID=<開発用 Client ID>
GITHUB_CLIENT_SECRET=<開発用 Client Secret>
SPA_ORIGIN=http://localhost:5173
```

`.dev.vars` は `.gitignore` 対象のため、リポジトリにコミットされない。

### 5. 本番用 OAuth App を作成

同じ手順でもう 1 つ作成する。

| 項目                       | 値                                                              |
| -------------------------- | --------------------------------------------------------------- |
| Application name           | `ATO`                                                           |
| Homepage URL               | `https://<GitHub ユーザー名>.github.io/ato`                     |
| Authorization callback URL | `https://ato-oauth.<CF アカウント名>.workers.dev/auth/callback` |

- Client ID と Client Secret を控える
- 本番用の認証情報は Cloudflare Workers の Secrets に設定する（→ [02-cloudflare-workers.md](./02-cloudflare-workers.md)）

---

## 注意事項

- `repo` スコープを使用する（GitHub OAuth App では Issue のみの権限分離ができないため）
- SPA はコード上で `ato-datastore` リポジトリのみにアクセスを制限する
- Callback URL は OAuth Proxy のドメインに設定する（SPA のドメインではない）
