# @ato/oauth-proxy

GitHub OAuth のトークン交換を中継するプロキシ。Cloudflare Workers で動作。

## 技術スタック

- Cloudflare Workers
- TypeScript 5
- wrangler 4

## セットアップ

```bash
# プロジェクトルートで
pnpm install

# 環境変数の設定
cp .dev.vars.example .dev.vars
# .dev.vars を編集: GitHub OAuth App の設定値を入力
```

### GitHub OAuth App の作成

1. GitHub Settings > Developer settings > OAuth Apps > New OAuth App
2. 設定値:
   - Application name: `ATO (dev)`
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `http://localhost:5173/auth/callback`
3. Client ID と Client Secret を `.dev.vars` に記入

## 開発コマンド

```bash
# 開発サーバー起動 (http://localhost:8787)
pnpm --filter @ato/oauth-proxy dev

# TypeScript 型チェック
pnpm --filter @ato/oauth-proxy typecheck

# 本番デプロイ
pnpm --filter @ato/oauth-proxy deploy
```

## 環境変数

| 変数名                 | 説明                              | 設定方法                    |
| ---------------------- | --------------------------------- | --------------------------- |
| `GITHUB_CLIENT_ID`     | GitHub OAuth App の Client ID     | `wrangler secret put`       |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App の Client Secret | `wrangler secret put`       |
| `SPA_ORIGIN`           | SPA のオリジン (CORS 用)          | `wrangler.toml` の `[vars]` |

## エンドポイント

| メソッド | パス           | 説明           |
| -------- | -------------- | -------------- |
| GET      | `/auth/health` | ヘルスチェック |
