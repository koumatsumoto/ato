# ローカル開発環境

## 前提条件

- Node.js >= 22.0.0
- pnpm >= 10.0.0
- 開発用 GitHub OAuth App 作成済み（→ [01-github-oauth-app.md](./01-github-oauth-app.md)）

---

## セットアップ

### 1. 依存関係インストール

```bash
pnpm install
```

### 2. OAuth Proxy のローカル環境変数を設定

```bash
cp apps/oauth-proxy/.dev.vars.example apps/oauth-proxy/.dev.vars
```

`.dev.vars` を編集して開発用 OAuth App の認証情報を記入:

```ini
GITHUB_CLIENT_ID=<開発用 Client ID>
GITHUB_CLIENT_SECRET=<開発用 Client Secret>
SPA_ORIGIN=http://localhost:5173
```

---

## 開発サーバー起動

2 つのターミナルで起動する:

```bash
# ターミナル 1: SPA (port 5173)
pnpm dev

# ターミナル 2: OAuth Proxy (port 8787)
pnpm dev:proxy
```

SPA の Vite 設定で `/auth` へのリクエストが `localhost:8787` に自動プロキシされるため、SPA からの OAuth フローはシームレスに動作する。

---

## 動作確認

1. `http://localhost:5173/ato` にアクセス
2. ログイン画面が表示される
3. "Login with GitHub" をクリック
4. GitHub の認可画面が表示される
5. 承認後、SPA にリダイレクトされて TODO 一覧が表示される

---

## 主要コマンド

| コマンド         | 説明                         |
| ---------------- | ---------------------------- |
| `pnpm dev`       | SPA 開発サーバー (port 5173) |
| `pnpm dev:proxy` | OAuth Proxy (port 8787)      |
| `pnpm test`      | 全テスト実行                 |
| `pnpm build`     | SPA ビルド                   |
| `pnpm lint`      | ESLint 実行                  |
| `pnpm typecheck` | TypeScript 型チェック        |
