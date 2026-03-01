# @ato/oauth-proxy

GitHub 認証連携用の Cloudflare Workers アプリ。

## 技術スタック

- Cloudflare Workers
- TypeScript 5
- wrangler 4
- vitest 4

---

## セットアップ

```bash
# ルートで依存インストール
pnpm install

# ローカル環境変数
cp .dev.vars.example .dev.vars
```

`.dev.vars` 例:

```ini
GITHUB_CLIENT_ID=<Client ID>
GITHUB_CLIENT_SECRET=<Client Secret>
SPA_ORIGIN=http://localhost:5173
```

GitHub App の callback URL は `http://localhost:8787/auth/callback` を設定する。

---

## 開発コマンド

```bash
pnpm --filter @ato/oauth-proxy dev
pnpm --filter @ato/oauth-proxy typecheck
pnpm --filter @ato/oauth-proxy test
pnpm --filter @ato/oauth-proxy test:coverage
pnpm --filter @ato/oauth-proxy deploy
```

---

## エンドポイント

| Method | Path             | 用途                    |
| ------ | ---------------- | ----------------------- |
| GET    | `/auth/login`    | 認証開始                |
| GET    | `/auth/callback` | code 交換 + postMessage |
| POST   | `/auth/refresh`  | refresh token 交換      |
| GET    | `/auth/health`   | ヘルスチェック          |

---

## 環境変数

| 変数名                 | 種別     | 用途                           |
| ---------------------- | -------- | ------------------------------ |
| `GITHUB_CLIENT_ID`     | Secret   | token 交換                     |
| `GITHUB_CLIENT_SECRET` | Secret   | token 交換                     |
| `SPA_ORIGIN`           | Variable | CORS / postMessage 許可 origin |
