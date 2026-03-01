# GitHub リポジトリ設定

## 概要

GitHub Pages と Actions の Secrets / Variables を設定し、CI 成功後に deploy が走る状態を作る。

---

## 1. GitHub Pages を有効化

Settings > Pages > Build and deployment

- Source: `GitHub Actions`

---

## 2. Repository Secret

Settings > Secrets and variables > Actions > Secrets

| Name                   | 用途                       |
| ---------------------- | -------------------------- |
| `CLOUDFLARE_API_TOKEN` | Workers デプロイ用トークン |

---

## 3. Repository Variable

Settings > Secrets and variables > Actions > Variables

| Name              | 用途                                  | 例                                          |
| ----------------- | ------------------------------------- | ------------------------------------------- |
| `OAUTH_PROXY_URL` | SPA ビルド時の `VITE_OAUTH_PROXY_URL` | `https://ato-oauth.<subdomain>.workers.dev` |

---

## 4. ワークフロー実行順

1. `ci.yml` (`pull_request` / `push main`)
2. CI 成功後、`deploy-spa.yml` (`workflow_run`)
3. CI 成功後、`deploy-oauth-proxy.yml` (`workflow_run`)

つまり deploy は `main` への push 自体ではなく、`CI` 成功を条件に実行される。

---

## 5. 初回確認

1. `main` へ push または PR をマージ
2. Actions タブで `CI` -> `Deploy SPA` / `Deploy OAuth Proxy` が success
3. `https://<user>.github.io/ato` にアクセス
4. ログイン後、Action の作成/更新が可能であることを確認

---

## 6. 設定対応表

| 設定場所         | 名前                   | 用途                           |
| ---------------- | ---------------------- | ------------------------------ |
| GitHub Secret    | `CLOUDFLARE_API_TOKEN` | Workers deploy                 |
| GitHub Variable  | `OAUTH_PROXY_URL`      | SPA build 時の proxy URL       |
| Workers Secret   | `GITHUB_CLIENT_ID`     | token 交換                     |
| Workers Secret   | `GITHUB_CLIENT_SECRET` | token 交換                     |
| Workers Variable | `SPA_ORIGIN`           | CORS / postMessage 許可 origin |
