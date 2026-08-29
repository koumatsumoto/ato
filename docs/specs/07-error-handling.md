# 07. Error Handling

## OAuth popup errors

| Case                  | Payload                                                                 |
| --------------------- | ----------------------------------------------------------------------- |
| missing params        | `{ type: "gh-auth-bridge:auth:error", error: "missing_params" }`        |
| invalid state         | `{ type: "gh-auth-bridge:auth:error", error: "invalid_state" }`         |
| token exchange failed | `{ type: "gh-auth-bridge:auth:error", error: "token_exchange_failed" }` |

## Refresh errors

- `400`: invalid request or missing refresh token
- `401`: refresh failed
- `403`: forbidden origin
- `502`: upstream failure

## TOP composer errors

- GitHub identity の取得中は下書き入力を許可し、追加操作を準備中として無効化する
- repository が未設定の場合は下書きを保持し、`SetupGuide` へ誘導する
- Issue 作成に失敗した場合は楽観的追加を戻し、入力欄の下書きを保持して再試行可能にする
- 一覧の読み込み・検索エラーは composer を置き換えない

## Speech recognition errors

| Browser error                         | UI behavior                                      |
| ------------------------------------- | ------------------------------------------------ |
| `not-allowed` / `service-not-allowed` | マイク設定の確認を案内し、下書きを保持する       |
| `no-speech` / `nomatch`               | 再入力を案内し、下書きを保持する                 |
| `audio-capture`                       | 端末のマイク設定の確認を案内する                 |
| `network`                             | 通信状態の確認を案内し、キーボード入力を維持する |
| `aborted` by user                     | エラーにせず idle へ戻す                         |
