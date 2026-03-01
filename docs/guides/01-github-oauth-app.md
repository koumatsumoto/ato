# GitHub App 設定ガイド

> ファイル名は互換のため `01-github-oauth-app.md` のまま維持しているが、現行運用は GitHub App 前提。

## 概要

ATO は GitHub App ベースで認証する。
このガイドでは、OAuth Proxy (`/auth/callback`) へ戻すための GitHub App 設定を行う。

---

## 1. GitHub App を作成

GitHub > Settings > Developer settings > GitHub Apps > New GitHub App

### 必須設定

| 項目         | 開発例                                | 本番例                                                    |
| ------------ | ------------------------------------- | --------------------------------------------------------- |
| App name     | `ATO (dev)`                           | `ATO`                                                     |
| Homepage URL | `http://localhost:5173`               | `https://<user>.github.io/ato`                            |
| Callback URL | `http://localhost:8787/auth/callback` | `https://ato-oauth.<subdomain>.workers.dev/auth/callback` |

### 権限

- Repository permissions: `Issues` = Read and write
- Metadata は既定の Read-only

### 追加オプション

- `Request user authorization (OAuth) during installation` を有効化

---

## 2. Client ID / Client Secret を取得

作成後の画面で以下を控える。

- Client ID
- Client Secret (再表示不可)

---

## 3. 開発環境へ設定

`apps/oauth-proxy/.dev.vars`:

```ini
GITHUB_CLIENT_ID=<Client ID>
GITHUB_CLIENT_SECRET=<Client Secret>
SPA_ORIGIN=http://localhost:5173
```

---

## 4. 本番環境へ設定

Cloudflare Workers Secrets:

```bash
cd apps/oauth-proxy
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```

`wrangler.toml` の `SPA_ORIGIN` は GitHub Pages origin を指定する。

---

## 5. GitHub App インストール

利用する GitHub アカウント/組織にアプリをインストールし、`ato-datastore` へアクセス可能な状態にする。

SPA からは、リポジトリ未設定時に `SetupGuide` でインストール導線を表示する。

実装上の既定リンクは `https://github.com/apps/ato-app/installations/new` で固定されている。
別名 App を使う場合は `apps/spa/src/features/actions/components/SetupGuide.tsx` の `INSTALL_APP_URL` を更新する。
