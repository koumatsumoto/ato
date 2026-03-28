# 01. 全体アーキテクチャ

## 概要

ATO は「やること (Action)」を GitHub Issues に保存する SPA である。
フロントエンド (`apps/spa`) がアプリケーションロジックを担い、OAuth Proxy (`apps/oauth-proxy`) は GitHub 認証コード交換とトークンリフレッシュのみを担当する。

---

## システム構成

```text
+------------------+        +---------------------+
| SPA              |  REST  | GitHub REST API     |
| (GitHub Pages)   |------->| (api.github.com)    |
|                  |<-------|                     |
| - React 19       |        +----------+----------+
| - React Router 7 |                   |
| - TanStack Query |                   v
| - Action UI      |        +---------------------+
| - GitHub API直通  |        | GitHub Repository    |
+--------+---------+        | {login}/ato-datastore|
         |                  | (Issues)             |
         | OAuth only       +---------------------+
         v
+------------------+
| OAuth Proxy      |
| (Cloudflare      |
| Workers)         |
| - /auth/login    |
| - /auth/callback |
| - /auth/refresh  |
+------------------+
```

### コンポーネント責務

| コンポーネント | 責務                                                                                  |
| -------------- | ------------------------------------------------------------------------------------- |
| SPA            | 画面描画、認証状態管理、Action CRUD、検索、ラベル管理、下書き復元                     |
| OAuth Proxy    | `code -> token` 交換、`refresh_token -> access_token` 更新、セキュリティヘッダー/CORS |
| GitHub API     | `/user`、`/repos/{login}/ato-datastore/issues`、`/search/issues` などの API 提供      |
| GitHub Issues  | Action データ永続化 (1 Issue = 1 Action)                                              |

---

## 認証アーキテクチャ

### 採用方式

- popup + postMessage
- SPA と OAuth Proxy は別オリジン
- access token / refresh token は SPA の `localStorage` で管理

### 認証フロー概要

```text
1. SPA: popup で /auth/login を開く
2. OAuth Proxy: state を Cookie 保存し GitHub 認可画面へ 302
3. GitHub: /auth/callback?code&state にリダイレクト
4. OAuth Proxy: state 検証後、token 交換
5. OAuth Proxy: postMessage で token 情報を返却し popup close
6. SPA: token を保存し /user 取得でログイン確定
```

### トークン更新

```text
1. SPA -> GitHub API 呼び出しで 401
2. SPA -> OAuth Proxy /auth/refresh (Origin 検証あり)
3. OAuth Proxy -> GitHub token endpoint (grant_type=refresh_token)
4. SPA: 新 access token を保存し元リクエストを再実行
```

---

## データフロー

### Action 一覧

```text
GET /repos/{login}/ato-datastore/issues?state=open&per_page=30&sort=created&direction=desc
-> PR を除外
-> Action 型へ変換して表示
```

### Action 追加

```text
POST /repos/{login}/ato-datastore/issues
{ title, body, labels }
```

### Action 更新

```text
PATCH /repos/{login}/ato-datastore/issues/{id}
{ title?, body?, labels?, state?, state_reason? }
```

### 検索

```text
GET /search/issues?q=repo:{login}/ato-datastore is:issue ...
```

---

## 初期セットアップ設計

`ensureRepository` は `ato-datastore` の存在確認のみを行う。

- 200: 続行
- 404: `RepoNotConfiguredError` を返し、SPA でセットアップガイドを表示

SPA のセットアップガイドは以下を案内する。

1. `ato-datastore` リポジトリ作成
2. GitHub App インストール
3. ページ再読み込み

---

## デプロイ構成

| 対象               | 配備先             | トリガー                          |
| ------------------ | ------------------ | --------------------------------- |
| CI                 | GitHub Actions     | `pull_request` / `push` to `main` |
| SPA Deploy         | GitHub Pages       | `CI` 成功時の `workflow_run`      |
| OAuth Proxy Deploy | Cloudflare Workers | `CI` 成功時の `workflow_run`      |

Node 実行ポリシー:

- 開発環境: `>=24.13.0`
- CI / Deploy: `actions/setup-node` で `node-version: "24"` (24 系最新追従)

---

## 技術スタック

### SPA

- React 19
- TypeScript 5
- Vite 6
- React Router 7
- TanStack Query 5
- TailwindCSS 4
- Vitest 4

### OAuth Proxy

- Cloudflare Workers
- TypeScript 5
- Wrangler 4

### 共通開発基盤

- pnpm 10
- ESLint 9
- Prettier 3
- Husky 9
- lint-staged 16
