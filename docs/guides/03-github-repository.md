# GitHub リポジトリ設定

## 概要

GitHub Pages の有効化と、GitHub Actions で使用する Secrets / Variables を設定する。

---

## 手順

### 1. GitHub Pages を有効化

Settings > Pages > Build and deployment

- Source: **GitHub Actions** を選択

GitHub Actions ワークフローの push 前にこの設定を済ませること。`github-pages` 環境が存在しないとデプロイジョブが失敗する。

### 2. Repository Secret を追加

Settings > Secrets and variables > Actions > Secrets タブ > "New repository secret"

| Name                   | Value                   |
| ---------------------- | ----------------------- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API トークン |

### 3. Repository Variable を追加

Settings > Secrets and variables > Actions > Variables タブ > "New repository variable"

| Name              | Value                                             |
| ----------------- | ------------------------------------------------- |
| `OAUTH_PROXY_URL` | `https://ato-oauth.<CF アカウント名>.workers.dev` |

この値は SPA ビルド時に `VITE_OAUTH_PROXY_URL` として注入される。

### 4. 初回デプロイの実行

main ブランチに push すると、以下のワークフローが実行される:

- `ci.yml` - lint, typecheck, test
- `deploy-spa.yml` - SPA を GitHub Pages にデプロイ（`apps/spa/` 変更時）
- `deploy-oauth-proxy.yml` - OAuth Proxy を Cloudflare Workers にデプロイ（`apps/oauth-proxy/` 変更時）

Actions タブで各ワークフローの成功を確認する。

### 5. 動作確認

1. `https://<GitHub ユーザー名>.github.io/ato` にアクセスしてログイン画面が表示されること
2. ログインボタンをクリックして GitHub OAuth フローが完了すること
3. TODO の作成・完了・削除が動作すること

---

## 設定値の対応関係

| 設定場所          | 変数名                 | 値の例                              |
| ----------------- | ---------------------- | ----------------------------------- |
| GitHub Secret     | `CLOUDFLARE_API_TOKEN` | Cloudflare API トークン             |
| GitHub Variable   | `OAUTH_PROXY_URL`      | `https://ato-oauth.xxx.workers.dev` |
| Cloudflare Secret | `GITHUB_CLIENT_ID`     | OAuth App Client ID                 |
| Cloudflare Secret | `GITHUB_CLIENT_SECRET` | OAuth App Client Secret             |
| wrangler.toml     | `SPA_ORIGIN`           | `https://<user>.github.io`          |
