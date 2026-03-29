# ローカル開発

## 前提

- `gh-auth-bridge` repo を別途 clone 済み
- GitHub App Client ID / Secret を取得済み

## 手順

1. ATO の依存をインストールする
2. `.env` に `VITE_OAUTH_PROXY_URL=http://localhost:8787` を設定する
3. `gh-auth-bridge` 側で `.dev.vars` を設定し `pnpm dev` を起動する
4. ATO 側で `pnpm dev` を起動する

## 動作確認

- popup で GitHub 認可へ遷移する
- 認可後に `gh-auth-bridge:token` が保存される
- リロード後も認証状態が維持される
