# 11. GitHub App Migration

GitHub App ベース認証への移行は完了している。現在はその運用基盤を `gh-auth-bridge` repo に外出しした状態を正とする。

## 移行後の前提

- callback URL は `gh-auth-bridge` Worker `/auth/callback`
- install 対象 repo は `ato-datastore`, `zai-datastore`
- ATO 側は `gh-auth-bridge` の popup contract と shared storage key を前提にする

## ATO 側の残責務

- `OAUTH_PROXY_URL` を正しい Worker URL に保つ
- App install 導線の slug 変更があれば `SetupGuide.tsx` を更新する
