# 08. Security

## Token management

shared auth token は localStorage の以下 key に保存する。

- `gh-auth-bridge:token`
- `gh-auth-bridge:refresh-token`
- `gh-auth-bridge:token-expires-at`
- `gh-auth-bridge:refresh-expires-at`

## リスク低減

- SPA 側で `event.origin` を検証する
- bridge 側で `targetOrigin` を固定する
- refresh endpoint は `Origin === SPA_ORIGIN` を必須化する
- `dangerouslySetInnerHTML` を使わない
- `GITHUB_CLIENT_SECRET` を repo に含めない

## 音声入力

- ATO は Web Speech API の認識結果だけを下書きへ反映し、音声データを保存しない
- ブラウザによって音声が外部の認識サービスへ送信される場合があることを composer に表示する
- 音声認識結果を自動保存せず、利用者が確認・修正してから明示的に追加する
- 外部 AI API key、音声保存基盤、従量課金サービスを追加しない

## 運用チェック

- `VITE_OAUTH_PROXY_URL` が本番 bridge URL
- `SPA_ORIGIN` が Pages origin と一致
- GitHub App callback URL が `/auth/callback`
- Worker secrets が Cloudflare に設定済み
