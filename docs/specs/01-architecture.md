# 01. 全体アーキテクチャ

## 概要

ATO は GitHub Issues をデータストアとする超軽量 TODO アプリ。
SPA (GitHub Pages) と BFF (Deno Deploy) の 2 層構成で、GitHub OAuth による認証を行う。

---

## システム構成図

```
+------------------+        +------------------+        +------------------+
|                  |  REST  |                  | REST   |                  |
|  SPA             |------->|  BFF             |------->|  GitHub API      |
|  (GitHub Pages)  |<-------|  (Deno Deploy)   |<-------|                  |
|                  |        |                  |        +------------------+
|  - React 19      |        |  - Hono v4       |               |
|  - Vite 6        |        |  - Deno KV       |               v
|  - TailwindCSS 4 |        |  - OAuth proxy   |        +------------------+
|  - TanStack Q v5 |        |                  |        |  GitHub Issues   |
+------------------+        +------------------+        |  (ato-datastore) |
                                                        +------------------+
```

### コンポーネント責務

| コンポーネント | 責務                                                                           |
| -------------- | ------------------------------------------------------------------------------ |
| SPA            | UI レンダリング、画面遷移、入力体験、BFF API 呼び出し                          |
| BFF            | GitHub OAuth 認証代行、セッション管理、GitHub API プロキシ、入力バリデーション |
| GitHub API     | Issue CRUD、ユーザー認証、リポジトリ管理                                       |
| GitHub Issues  | TODO データの永続化 (1 Issue = 1 TODO)                                         |
| Deno KV        | セッション・OAuth state・リポ初期化キャッシュの保存                            |

---

## 認証フロー概要

OAuth + popup + postMessage パターンを採用。
SPA と BFF が別オリジン (_.github.io / _.deno.dev) のため、Cookie ではなく Bearer トークンで認証する。

```
1. SPA: popup で BFF /auth/login を開く
2. BFF: GitHub OAuth 認可画面へリダイレクト (302)
3. GitHub: ユーザー認可後、BFF /auth/callback にリダイレクト
4. BFF: code を access_token に交換、セッションを Deno KV に保存
5. BFF: postMessage でセッショントークンを SPA に返却、popup を閉じる
6. SPA: localStorage にトークンを保存、以降 Authorization: Bearer で送信
```

詳細は [04-auth-flow.md](./04-auth-flow.md) を参照。

---

## データフロー

### TODO 作成

```
SPA                          BFF                          GitHub API
 |                            |                            |
 |-- POST /todos ----------->|                            |
 |   { title, body? }        |                            |
 |   Authorization: Bearer    |                            |
 |                            |-- Validate session ------->| (Deno KV)
 |                            |-- Ensure repo exists ----->| (cache/API)
 |                            |-- POST /repos/.../issues ->|
 |                            |   { title, body }          |
 |                            |<-- 201 Issue --------------|
 |<-- 201 Todo --------------|                            |
 |   { id, title, body, ... } |                            |
```

### TODO 一覧取得

```
SPA                          BFF                          GitHub API
 |                            |                            |
 |-- GET /todos?state=open -->|                            |
 |   &limit=30                |                            |
 |                            |-- Validate session ------->| (Deno KV)
 |                            |-- GET /repos/.../issues -->|
 |                            |   ?state=open&per_page=30  |
 |                            |   &sort=updated&direction=desc
 |                            |<-- 200 Issues[] -----------|
 |<-- 200 Todos[] ------------|                            |
```

### TODO 完了

```
SPA                          BFF                          GitHub API
 |                            |                            |
 |-- POST /todos/:id/close ->|                            |
 |                            |-- PATCH /repos/.../issues/N ->|
 |                            |   { state: "closed" }         |
 |                            |<-- 200 Issue -----------------|
 |<-- 200 Todo --------------|                            |
```

---

## モノリポ構成

pnpm workspace によるモノリポ。`~/projects/monorepo` パターンに準拠。

```
ato/
  packages/
    shared/     # 共有 TypeScript 型定義 (SPA + BFF で利用)
    spa/        # React SPA (GitHub Pages にデプロイ)
    bff/        # Deno BFF (Deno Deploy にデプロイ、pnpm workspace 外)
```

- `packages/shared` と `packages/spa` が pnpm workspace に含まれる
- `packages/bff` は Deno 管理 (deno.json) で pnpm workspace 外
- BFF は shared パッケージを Deno import map 経由で参照

詳細は [02-monorepo-setup.md](./02-monorepo-setup.md) を参照。

---

## デプロイ構成

| コンポーネント | ホスティング | デプロイトリガー                                   |
| -------------- | ------------ | -------------------------------------------------- |
| SPA            | GitHub Pages | main push (packages/spa or packages/shared 変更時) |
| BFF            | Deno Deploy  | main push (packages/bff or packages/shared 変更時) |

詳細は [09-ci-cd.md](./09-ci-cd.md) を参照。

---

## 技術スタック

### SPA

| 技術             | 用途                            |
| ---------------- | ------------------------------- |
| React 19         | UI フレームワーク               |
| TypeScript 5     | 型安全                          |
| Vite 6           | ビルドツール                    |
| TailwindCSS 4    | スタイリング                    |
| React Router 7   | ルーティング (declarative mode) |
| TanStack Query 5 | サーバー状態管理                |
| zod 3            | バリデーション                  |
| Vitest 4         | テスト                          |

### BFF

| 技術    | 用途                   |
| ------- | ---------------------- |
| Deno    | ランタイム             |
| Hono 4  | HTTP フレームワーク    |
| Deno KV | セッション・キャッシュ |

### 開発ツール

| 技術           | 用途                 |
| -------------- | -------------------- |
| pnpm 10        | パッケージ管理       |
| husky 9        | Git hooks            |
| lint-staged 16 | pre-commit チェック  |
| ESLint 9       | リント (flat config) |
| Prettier 3     | フォーマッタ         |
