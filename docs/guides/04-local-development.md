# ローカル開発環境

## 前提条件

- Node.js >= 24.13.0
- pnpm >= 10.0.0
- GitHub App の Client ID / Secret を取得済み

---

## セットアップ

### 1. 依存関係インストール

```bash
pnpm install
```

### 2. OAuth Proxy のローカル環境変数

```bash
cp apps/oauth-proxy/.dev.vars.example apps/oauth-proxy/.dev.vars
```

`apps/oauth-proxy/.dev.vars`:

```ini
GITHUB_CLIENT_ID=<Client ID>
GITHUB_CLIENT_SECRET=<Client Secret>
SPA_ORIGIN=http://localhost:5173
```

### 3. SPA のローカル環境変数

```bash
echo 'VITE_OAUTH_PROXY_URL=http://localhost:8787' > apps/spa/.env
```

---

## 開発サーバー起動

```bash
# SPA + OAuth Proxy 同時起動
pnpm dev

# 個別起動する場合
pnpm dev:spa
pnpm dev:proxy
```

Vite proxy により `/auth` は自動で `localhost:8787` へ転送される。

---

## 動作確認

1. `http://localhost:5173/ato` を開く
2. `Login with GitHub` をクリック
3. 認証後に一覧が表示される
4. Action の作成/編集ができる

---

## 主要コマンド

| コマンド         | 説明                       |
| ---------------- | -------------------------- |
| `pnpm dev`       | SPA + OAuth Proxy 同時起動 |
| `pnpm dev:spa`   | SPA のみ                   |
| `pnpm dev:proxy` | OAuth Proxy のみ           |
| `pnpm test`      | 全テスト                   |
| `pnpm typecheck` | 型チェック                 |
| `pnpm lint`      | Lint                       |
| `pnpm build`     | SPA ビルド                 |
