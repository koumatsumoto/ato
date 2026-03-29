# 06. Data Model

## localStorage

| Key                                 | Type            | Purpose              |
| ----------------------------------- | --------------- | -------------------- |
| `gh-auth-bridge:token`              | string          | access token         |
| `gh-auth-bridge:refresh-token`      | string          | refresh token        |
| `gh-auth-bridge:token-expires-at`   | string(number)  | access token expiry  |
| `gh-auth-bridge:refresh-expires-at` | string(number)  | refresh token expiry |
| `ato:user`                          | string(JSON)    | cached user          |
| `ato:repo-initialized`              | string(boolean) | setup cache          |
| `ato:action-order`                  | string          | UI preference        |
