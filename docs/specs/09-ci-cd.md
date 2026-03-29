# 09. CI/CD

## ATO repo

- `ci.yml`: format, markdownlint, eslint, typecheck, SPA tests
- `deploy-spa.yml`: CI success 後に GitHub Pages へ deploy

## Variables

| Name              | Type                    | Purpose                                      |
| ----------------- | ----------------------- | -------------------------------------------- |
| `OAUTH_PROXY_URL` | GitHub Actions Variable | `VITE_OAUTH_PROXY_URL` に注入する bridge URL |

## 外部依存

認証 bridge の CI/CD は `gh-auth-bridge` repo 側で管理する。ATO repo では Cloudflare deploy を持たない。
