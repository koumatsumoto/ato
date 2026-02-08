# 11. GitHub App 移行設計

## 概要

GitHub OAuth App から GitHub App に移行し、認証時の権限を最小化する。

**現状の問題:**

- OAuth App は `scope: "repo"` でユーザーの全リポジトリにフルアクセスを要求
- GitHub OAuth App には Issue のみのスコープが存在しない
- 実際に必要なのは `ato-datastore` リポジトリの Issue 操作のみ

**移行後の姿:**

- GitHub App の細粒度パーミッションで Issues: Read & Write のみを要求
- ユーザーがインストール時にリポジトリを選択可能
- トークンは無期限（Expire user authorization tokens: 無効）

---

## 1. GitHub App と OAuth App の比較

| 観点             |              OAuth App (現行)               |        GitHub App (移行後)         |
| ---------------- | :-----------------------------------------: | :--------------------------------: |
| 権限モデル       | `repo` スコープ（全リポジトリフルアクセス） |     Issues: Read & Write のみ      |
| リポジトリ制限   |                全リポジトリ                 |           ユーザーが選択           |
| トークン形式     |            `gho_` プレフィックス            |       `ghu_` プレフィックス        |
| トークン有効期限 |                   無期限                    | 無期限（Expire user tokens: 無効） |
| 認可フロー       |          OAuth 2.0 (scope ベース)           |     OAuth 2.0 (App 権限ベース)     |
| レート制限       |         5,000 リクエスト/時（固定）         |   インストール数に応じてスケール   |

---

## 2. GitHub App 登録設定

GitHub Developer Settings > GitHub Apps > New GitHub App で登録する。

### 基本情報

| 設定項目             | 値                                                        |
| -------------------- | --------------------------------------------------------- |
| GitHub App name      | `ATO App`                                                 |
| Homepage URL         | `https://koumatsumoto.github.io/ato/`                     |
| Callback URL         | `https://ato-oauth.<subdomain>.workers.dev/auth/callback` |
| Setup URL (optional) | なし                                                      |
| Webhook Active       | 無効                                                      |

### ユーザー認可設定

| 設定項目                                               | 値   | 説明                                             |
| ------------------------------------------------------ | ---- | ------------------------------------------------ |
| Expire user authorization tokens                       | 無効 | トークン無期限。リフレッシュ不要で実装がシンプル |
| Request user authorization (OAuth) during installation | 有効 | インストール時にユーザー認可も同時に行う         |
| Enable Device Flow                                     | 無効 | Web フローのみ使用                               |

### パーミッション

**Repository permissions:**

| Permission | Access       | 必要理由                           |
| ---------- | ------------ | ---------------------------------- |
| Issues     | Read & Write | TODO の CRUD 操作                  |
| Metadata   | Read-only    | 自動付与、リポジトリ存在確認に使用 |

**Account permissions:** なし

### インストール対象

- **Only on this account** (開発時)
- **Any account** (公開時)

### 取得される認証情報

| 値            | 用途                                                 |
| ------------- | ---------------------------------------------------- |
| App ID        | 今回は使用しない（server-to-server 認証用）          |
| Client ID     | `Iv23li...` 形式。認可 URL の `client_id` パラメータ |
| Client secret | トークン交換時に使用。OAuth Proxy の Secrets に保存  |

---

## 3. 認証フロー（変更後）

### 3.1 シーケンス図

```text
SPA (*.github.io)              OAuth Proxy (CF Workers)         GitHub
     |                              |                              |
     |  (1) window.open             |                              |
     |----> GET /auth/login ------->|                              |
     |                              |                              |
     |                              |  (2) state 生成              |
     |                              |  HttpOnly Cookie に保存      |
     |                              |                              |
     |                              |  (3) 302 Redirect            |
     |                              |----> github.com/login/ ----->|
     |                              |      oauth/authorize         |
     |                              |      ?client_id=Iv23li...    |
     |                              |      &redirect_uri=.../callback
     |                              |      &state={random}         |
     |                              |      (scope パラメータなし)  |
     |                              |                              |
     |                              |              ユーザー認可    |
     |                              |              (App 権限表示)  |
     |                              |                              |
     |                              |  (4) GitHub redirect         |
     |                              |<---- GET /auth/callback -----|
     |                              |      ?code=...&state=...     |
     |                              |                              |
     |                              |  (5) Cookie の state 検証    |
     |                              |                              |
     |                              |  (6) code -> token 交換      |
     |                              |----> POST .../access_token ->|
     |                              |      { client_id,            |
     |                              |        client_secret, code } |
     |                              |                              |
     |                              |<---- { access_token } -------|
     |                              |                              |
     |  (7) HTML + postMessage      |                              |
     |<---- { type, accessToken } --|                              |
     |                              |                              |
     |  (8) localStorage に保存     |                              |
     |  (9) popup を閉じる          |                              |
```

### 3.2 OAuth App との差分

| ステップ         | OAuth App (現行)            | GitHub App (移行後)                 |
| ---------------- | --------------------------- | ----------------------------------- |
| (3) 認可 URL     | `scope=repo` パラメータあり | `scope` パラメータなし              |
| (6) トークン応答 | `{ access_token }`          | `{ access_token }`（同一形式）      |
| (7) postMessage  | `{ type, accessToken }`     | `{ type, accessToken }`（同一形式） |

トークン有効期限を無効にしたため、レスポンス形式・postMessage 形式は現行と同一。
唯一の変更点は認可 URL から `scope=repo` を削除すること。

---

## 4. OAuth Proxy の変更

### 4.1 エンドポイント一覧（変更後）

| メソッド | パス           | 説明             | 変更       |
| -------- | -------------- | ---------------- | ---------- |
| GET      | /auth/login    | OAuth フロー開始 | scope 削除 |
| GET      | /auth/callback | コールバック処理 | 変更なし   |
| GET      | /auth/health   | ヘルスチェック   | 変更なし   |

### 4.2 GET /auth/login の変更

**リダイレクト先:**

```text
https://github.com/login/oauth/authorize
  ?client_id={GITHUB_CLIENT_ID}
  &redirect_uri={OAUTH_PROXY_ORIGIN}/auth/callback
  &state={state}
```

`scope` パラメータを削除。GitHub App では権限が App 設定で定義済みのため不要。

**コード変更（1 行のみ）:**

```diff
 const params = new URLSearchParams({
   client_id: env.GITHUB_CLIENT_ID,
   redirect_uri: `${url.origin}/auth/callback`,
-  scope: "repo",
   state,
 });
```

### 4.3 GET /auth/callback

変更なし。トークン有効期限を無効にしたため、GitHub API レスポンスは現行と同一形式:

```json
{
  "access_token": "ghu_xxxxxxxxxxxx",
  "token_type": "bearer",
  "scope": ""
}
```

postMessage データも現行と同一:

```javascript
{
  type: "ato:auth:success",
  accessToken: "ghu_xxxx"
}
```

---

## 5. SPA の変更

### 5.1 トークン関連

**変更なし。** トークン有効期限を無効にしたため、以下のファイルは変更不要:

- `token-store.ts`: ストレージキーは `ato:token` のまま
- `auth-client.ts`: `openLoginPopup()` の戻り値は `string` のまま
- `use-auth.tsx`: リフレッシュタイマー不要
- `github-client.ts`: 401 時の処理は現行のまま（トークンクリア + AuthError）

### 5.2 型定義

**変更なし。** `OAuthSuccessMessage` は現行の `{ type, accessToken }` のまま。

---

## 6. リポジトリ自動作成の廃止

### 6.1 背景

GitHub App のユーザーアクセストークンは、App がインストールされたリポジトリにのみアクセスできる。
まだ存在しないリポジトリに対して `POST /user/repos` を実行する権限がない。

### 6.2 対策: セットアップガイド方式

`ensureRepository()` でリポジトリが存在しない場合、自動作成ではなくカスタムエラーをスローする。
SPA 側でエラーをキャッチし、セットアップガイドを表示する。

**セットアップガイドの内容:**

1. **リポジトリ作成**: `https://github.com/new?name=ato-datastore&visibility=private&auto_init=true` へのリンク
2. **GitHub App インストール**: `https://github.com/apps/ato-app/installations/new` へのリンク（リポジトリ選択画面）
3. **ページ再読み込み**: セットアップ完了後にリロード

**新規エラー型:**

```typescript
export class RepoNotConfiguredError extends Error {
  constructor() {
    super("ato-datastore repository not found. Please set up the repository first.");
    this.name = "RepoNotConfiguredError";
  }
}
```

**新規コンポーネント: `SetupGuide.tsx`**

リポジトリ未作成時に MainPage で表示するガイド UI。

---

## 7. 環境変数

変数名は変更なし。値のみ GitHub App のものに更新する。

| 変数名                 | 変更前の値                 | 変更後の値                                 |
| ---------------------- | -------------------------- | ------------------------------------------ |
| `GITHUB_CLIENT_ID`     | OAuth App の Client ID     | GitHub App の Client ID (`Iv23li...` 形式) |
| `GITHUB_CLIENT_SECRET` | OAuth App の Client Secret | GitHub App の Client Secret                |
| `SPA_ORIGIN`           | 変更なし                   | 変更なし                                   |

Cloudflare Workers の Secrets として `wrangler secret put` で更新する。

---

## 8. 既存ユーザーの移行

### 8.1 移行フロー

1. GitHub App 登録 & OAuth Proxy のシークレット更新
2. SPA のコード更新をデプロイ
3. 旧 OAuth App トークン (`gho_`) は GitHub App 切り替え後に無効
4. SPA の 401 ハンドリングが自動的に再ログインを促す
5. ユーザーが再ログインすると GitHub App のインストール + 認可画面が表示される
6. 動作確認後、旧 OAuth App を GitHub Developer Settings から削除

### 8.2 ユーザー影響

- 初回のみ再ログインが必要
- GitHub App のインストール確認画面が表示される（リポジトリ選択あり）
- 以降は通常通り使用可能

---

## 9. ファイル変更一覧

| ファイル                                                  | 変更種別 | 概要                                 |
| --------------------------------------------------------- | -------- | ------------------------------------ |
| `apps/oauth-proxy/src/index.ts`                           | 修正     | `scope: "repo"` を削除（1 行）       |
| `apps/oauth-proxy/src/__tests__/index.test.ts`            | 修正     | scope 関連のテスト更新               |
| `apps/spa/src/features/actions/lib/repo-init.ts`          | 修正     | 自動作成廃止、RepoNotConfiguredError |
| `apps/spa/src/features/actions/components/SetupGuide.tsx` | 新規     | セットアップガイド UI                |
| `apps/spa/src/types/errors.ts`                            | 修正     | RepoNotConfiguredError 追加          |

---

## 10. 実装順序

| Phase | 作業                                | 依存      |
| ----- | ----------------------------------- | --------- |
| 1     | GitHub App 登録（手動）             | なし      |
| 2     | OAuth Proxy 更新（scope 削除）      | Phase 1   |
| 3     | リポジトリ自動作成廃止 + SetupGuide | なし      |
| 4     | テスト更新                          | Phase 2-3 |
| 5     | デプロイ & 環境変数更新             | Phase 4   |

---

## 11. テスト計画

### OAuth Proxy テスト

- [ ] `/auth/login`: 認可 URL に `scope` パラメータがないこと
- [ ] `/auth/callback`: 現行と同一の postMessage 形式で動作すること

### SPA テスト

- [ ] repo-init: リポジトリ未存在時に `RepoNotConfiguredError` がスローされること
- [ ] repo-init: リポジトリ存在時に正常動作すること
- [ ] SetupGuide: 正しいリンクが表示されること

---

## 12. リスク

| リスク                                 | 影響                                | 対策                                       |
| -------------------------------------- | ----------------------------------- | ------------------------------------------ |
| リポジトリ自動作成の廃止による UX 低下 | 初回セットアップが 2 ステップ増える | SetupGuide でわかりやすく案内              |
| 既存ユーザーの再ログイン               | 一時的な利用中断                    | 401 検知で自動的にログイン画面へ遷移       |
| トークン無期限のセキュリティ           | 漏洩時の影響範囲                    | 権限が Issues のみに限定されているため許容 |

---

## 参考資料

- [GitHub App のユーザーアクセストークン生成](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app)
- [GitHub App と OAuth App の違い](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps)
- [GitHub App の登録](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app)
