# GitHub リポジトリ設定

ATO repo では GitHub Pages deploy と `gh-auth-bridge` URL の注入だけを管理する。

## 1. GitHub Pages を有効化

- Settings > Pages > Source: `GitHub Actions`

## 2. Repository Variable

| Name              | 用途                                  | 例                                               |
| ----------------- | ------------------------------------- | ------------------------------------------------ |
| `OAUTH_PROXY_URL` | SPA build 時の `VITE_OAUTH_PROXY_URL` | `https://gh-auth-bridge.<subdomain>.workers.dev` |

## 3. ワークフロー実行順

1. `ci.yml`
2. `deploy-spa.yml`

認証 bridge の CI/CD は `gh-auth-bridge` repo 側で独立して実行される。

## 4. 初回確認

1. `OAUTH_PROXY_URL` が新 Worker を指していることを確認
2. CI と Deploy SPA が success
3. `https://koumatsumoto.github.io/ato` にアクセス
4. ログインと Issue 操作が成功することを確認
