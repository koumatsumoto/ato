# GitHub App 設定ガイド

ATO の認証は `gh-auth-bridge` が仲介する GitHub App を利用する。App 自体の設定責務は `gh-auth-bridge` repo にあるが、ATO が依存する前提をここに残す。

## 必須設定

| 項目         | 開発例                                | 本番例                                                         |
| ------------ | ------------------------------------- | -------------------------------------------------------------- |
| Homepage URL | `http://localhost:5173`               | `https://koumatsumoto.github.io/ato`                           |
| Callback URL | `http://localhost:8787/auth/callback` | `https://gh-auth-bridge.<subdomain>.workers.dev/auth/callback` |

## 権限

- Repository permissions: `Issues` = Read and write
- Metadata = Read-only
- `Request user authorization (OAuth) during installation` を有効化

## インストール対象

- `ato-datastore`
- `zai-datastore`

## ATO 側の注意点

- `src/features/actions/components/SetupGuide.tsx` の install URL は App slug に依存する
- App 名や slug を変える場合は、この定数を更新する
- callback URL は `gh-auth-bridge` の本番 Worker URL と一致させる
