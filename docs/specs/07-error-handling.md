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
