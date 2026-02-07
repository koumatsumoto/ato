# 01. 全体アーキテクチャ

## 概要

ATO は GitHub Issues をデータストアとする超軽量 TODO アプリ。
SPA (GitHub Pages) がビジネスロジックの全てを担い、OAuth Proxy (Cloudflare Workers) は GitHub OAuth の認証代行のみを行う。

---

## システム構成図

```
+------------------+        +------------------+
|                  |  REST  |                  |
|  SPA             |------->|  GitHub API      |
|  (GitHub Pages)  |<-------|  (api.github.com)|
|                  |        |                  |
|  - React 19      |        +------------------+
|  - Vite 6        |               |
|  - TailwindCSS 4 |               v
|  - TanStack Q v5 |        +------------------+
|  - GitHub API    |        |  GitHub Issues   |
|    直接呼び出し  |        |  (ato-datastore) |
+--------+---------+        +------------------+
         |
         | auth only
         v
+------------------+
|  OAuth Proxy     |
|  (CF Workers)    |
|  ~50 行          |
|                  |
|  - code->token   |
|    交換のみ      |
+------------------+
```

### コンポーネント責務

| コンポーネント | 責務                                                                              |
| -------------- | --------------------------------------------------------------------------------- |
| SPA            | UI レンダリング、画面遷移、GitHub API 直接呼び出し、Todo CRUD、リポジトリ自動作成 |
| OAuth Proxy    | GitHub OAuth code-to-token 交換のみ (client_secret の安全な保持)                  |
| GitHub API     | Issue CRUD、ユーザー認証情報、リポジトリ管理                                      |
| GitHub Issues  | TODO データの永続化 (1 Issue = 1 TODO)                                            |

---

## 認証フロー概要

OAuth + popup + postMessage パターンを採用。
SPA と OAuth Proxy が別オリジンのため、postMessage で access_token を受け渡す。
受け取った access_token は SPA の localStorage に保存し、以降の GitHub API 呼び出しに直接使用する。

```
1. SPA: popup で OAuth Proxy /auth/login を開く
2. OAuth Proxy: state を HttpOnly Cookie に保存、GitHub OAuth 認可画面へリダイレクト
3. GitHub: ユーザー認可後、OAuth Proxy /auth/callback にリダイレクト
4. OAuth Proxy: Cookie の state を検証、code を access_token に交換
5. OAuth Proxy: postMessage で access_token を SPA に返却、popup を閉じる
6. SPA: localStorage に access_token を保存、以降 GitHub API を直接呼び出し
```

詳細は [04-auth-flow.md](./04-auth-flow.md) を参照。

---

## データフロー

### TODO 作成

```
SPA                                              GitHub API
 |                                                |
 |-- POST /repos/{login}/ato-datastore/issues --->|
 |   { title, body }                              |
 |   Authorization: Bearer {access_token}         |
 |                                                |
 |<-- 201 Issue ----------------------------------|
 |                                                |
 |  SPA: Issue -> Todo に変換して表示              |
```

### TODO 一覧取得

```
SPA                                              GitHub API
 |                                                |
 |-- GET /repos/{login}/ato-datastore/issues ---->|
 |   ?state=open&per_page=30                      |
 |   &sort=updated&direction=desc                 |
 |   Authorization: Bearer {access_token}         |
 |                                                |
 |<-- 200 Issues[] -------------------------------|
 |                                                |
 |  SPA: Issues[] -> Todos[] に変換して表示        |
```

### TODO 完了

```
SPA                                              GitHub API
 |                                                |
 |-- PATCH /repos/{login}/ato-datastore/issues/N ->|
 |   { state: "closed", state_reason: "completed" }|
 |   Authorization: Bearer {access_token}          |
 |                                                 |
 |<-- 200 Issue -----------------------------------|
```

---

## プロジェクト構成

pnpm workspace によるモノリポ。

```
ato/
  apps/
    spa/            # React SPA (GitHub Pages にデプロイ)
    oauth-proxy/    # Cloudflare Workers OAuth Proxy (wrangler 管理)
```

- `apps/spa` が pnpm workspace に含まれる
- `apps/oauth-proxy` は wrangler 管理 (最小限の package.json + wrangler.toml)
- 型定義は SPA 内 (`apps/spa/src/types/`) に配置

詳細は [02-monorepo-setup.md](./02-monorepo-setup.md) を参照。

---

## デプロイ構成

| コンポーネント | ホスティング       | デプロイトリガー                    |
| -------------- | ------------------ | ----------------------------------- |
| SPA            | GitHub Pages       | main push (apps/spa 変更時)         |
| OAuth Proxy    | Cloudflare Workers | main push (apps/oauth-proxy 変更時) |

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

### OAuth Proxy

| 技術               | 用途                                    |
| ------------------ | --------------------------------------- |
| Cloudflare Workers | エッジランタイム                        |
| Web 標準 API       | HTTP ハンドリング (素の fetch/Response) |

### 開発ツール

| 技術           | 用途                   |
| -------------- | ---------------------- |
| pnpm 10        | パッケージ管理         |
| wrangler       | Cloudflare Workers CLI |
| husky 9        | Git hooks              |
| lint-staged 16 | pre-commit チェック    |
| ESLint 9       | リント (flat config)   |
| Prettier 3     | フォーマッタ           |

---

## 設計判断記録 (ADR)

### ADR-1: なぜ BFF を廃止して SPA ファーストにしたか

GitHub REST API は CORS をサポートしており (`Access-Control-Allow-Origin: *`)、ブラウザから直接呼び出せる。
認証済みリクエストは 5,000 req/hour/user で個人利用に十分。
BFF を経由する必要がなく、SPA から直接 GitHub API を呼ぶことでアーキテクチャを大幅に簡素化した。

### ADR-2: なぜ access_token をクライアント側に保存するか

サーバー側セッション管理 (Deno KV) を廃止し、GitHub access_token を SPA の localStorage に保存する。
XSS による token 窃取のリスクがあるが、以下の理由で許容する:

- 個人利用アプリであり、攻撃対象になりにくい
- 厳格な CSP で外部スクリプトを完全に遮断
- React の自動エスケープにより XSS リスクが低い
- `repo` スコープはユーザー自身のリポジトリへのアクセスのみ

### ADR-3: なぜ Cloudflare Workers を選択したか

OAuth Proxy に必要な要件: client_secret を安全に保持し、code-to-token 交換を行う。

- 無料枠: 100,000 req/日 (認証フロー程度では十分すぎる)
- コールドスタートなし (グローバルエッジで常時実行)
- Web 標準 API で実装 (フレームワーク不要、~50 行)
- Node.js 互換
