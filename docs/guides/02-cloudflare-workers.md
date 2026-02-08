# Cloudflare Workers セットアップ

## 概要

OAuth Proxy を Cloudflare Workers にデプロイする。API トークンの作成、初回デプロイ、Secrets の設定を行う。

---

## 手順

### 1. Cloudflare アカウント作成

未所持の場合: <https://dash.cloudflare.com/sign-up> でアカウントを作成。Free プランで十分。

### 2. API トークン作成

Cloudflare Dashboard > My Profile > API Tokens > "Create Token"

1. テンプレート "Edit Cloudflare Workers" の "Use Template" をクリック
2. 付与される権限:
   - Account: Workers Scripts (Edit)
   - Account: Account Settings (Read)
   - Zone: Workers Routes (Edit)
3. アカウントリソースを自分のアカウントのみに制限
4. "Continue to summary" > "Create Token"
5. トークンを控える（再表示不可）

このトークンは GitHub Actions の `CLOUDFLARE_API_TOKEN` Secret にも使う（→ [03-github-repository.md](./03-github-repository.md)）。

### 3. wrangler.toml の SPA_ORIGIN を編集

`apps/oauth-proxy/wrangler.toml` のプレースホルダーを実際の値に変更:

```toml
[vars]
SPA_ORIGIN = "https://<GitHub ユーザー名>.github.io"
```

### 4. 初回デプロイ

```bash
cd apps/oauth-proxy
npx wrangler deploy
```

初回実行時に Cloudflare ログインを求められる場合がある。Workers プロジェクト `ato-oauth` が自動作成される。

### 5. Secrets 設定

本番用の GitHub OAuth App の認証情報を設定:

```bash
npx wrangler secret put GITHUB_CLIENT_ID
# プロンプトに本番用 Client ID を入力

npx wrangler secret put GITHUB_CLIENT_SECRET
# プロンプトに本番用 Client Secret を入力
```

### 6. 動作確認

ブラウザで以下にアクセス:

```text
https://ato-oauth.<CF アカウント名>.workers.dev/auth/login
```

GitHub の認可画面にリダイレクトされれば成功。

---

## 環境変数一覧

| 名前                   | 種別     | 設定方法          | 説明                    |
| ---------------------- | -------- | ----------------- | ----------------------- |
| `SPA_ORIGIN`           | Variable | wrangler.toml     | SPA のオリジン          |
| `GITHUB_CLIENT_ID`     | Secret   | `wrangler secret` | OAuth App Client ID     |
| `GITHUB_CLIENT_SECRET` | Secret   | `wrangler secret` | OAuth App Client Secret |
