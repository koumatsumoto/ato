# Cloudflare Workers セットアップ

## 概要

`apps/oauth-proxy` を Cloudflare Workers にデプロイする手順。

---

## 1. API トークン作成

Cloudflare Dashboard > My Profile > API Tokens > Create Token

推奨テンプレート: `Edit Cloudflare Workers`

必要な主な権限:

- Account: Workers Scripts (Edit)
- Account: Account Settings (Read)
- Zone: Workers Routes (Edit)

このトークンは GitHub Actions Secret `CLOUDFLARE_API_TOKEN` にも登録する。

---

## 2. `wrangler.toml` 設定

`apps/oauth-proxy/wrangler.toml`:

```toml
[vars]
SPA_ORIGIN = "https://<GitHubユーザー名>.github.io"
```

`SPA_ORIGIN` は refresh endpoint の Origin 検証に使われるため、実際の Pages origin と一致させる。

---

## 3. 初回デプロイ

```bash
cd apps/oauth-proxy
npx wrangler deploy
```

必要に応じて `CLOUDFLARE_API_TOKEN` 環境変数で非対話デプロイする。

```bash
export CLOUDFLARE_API_TOKEN=<token>
npx wrangler deploy
```

---

## 4. Secrets 設定

GitHub App の Client 情報を Workers Secrets に設定する。

```bash
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```

---

## 5. 動作確認

- `https://ato-oauth.<subdomain>.workers.dev/auth/health` が `OK`
- `https://ato-oauth.<subdomain>.workers.dev/auth/login` で GitHub 認可画面へ遷移

---

## 6. 変数一覧

| 名前                   | 種別     | 用途                            |
| ---------------------- | -------- | ------------------------------- |
| `GITHUB_CLIENT_ID`     | Secret   | token 交換クライアント ID       |
| `GITHUB_CLIENT_SECRET` | Secret   | token 交換クライアント Secret   |
| `SPA_ORIGIN`           | Variable | CORS / postMessage 許可オリジン |
