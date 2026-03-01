# 08. セキュリティ

## 概要

ATO はブラウザ上で GitHub token を扱うため、XSS・CSRF・token 取り扱いを中心に対策する。

---

## 1. トークン管理

### 1.1 保存先

- `ato:token` (access token)
- `ato:refresh-token` (refresh token)
- `ato:token-expires-at`
- `ato:refresh-expires-at`

保存場所は `localStorage`。

### 1.2 リスク

`localStorage` は XSS が成立すると読み取られる可能性がある。
このため、以下でリスクを低減する。

- 厳格な CSP
- React の自動エスケープを前提 (`dangerouslySetInnerHTML` 不使用)
- OAuth Proxy 側の `postMessage` / `Origin` 検証

---

## 2. OAuth フロー防御

### 2.1 CSRF 対策

OAuth Proxy で `state` を利用。

1. `state` 生成
2. `oauth_state` を HttpOnly Cookie で保存
3. callback で query `state` と Cookie を照合

Cookie 属性:

- `HttpOnly`
- `Secure`
- `SameSite=Lax`
- `Max-Age=600`

### 2.2 postMessage 安全性

- 送信側: `targetOrigin` を `SPA_ORIGIN` に固定
- 受信側: `event.origin === new URL(proxyUrl).origin` を必須化

---

## 3. refresh エンドポイント防御

`POST /auth/refresh` では以下を必須化。

- `Origin` が `SPA_ORIGIN` と一致
- JSON body の妥当性
- `refreshToken` 存在

不一致時は `403 forbidden_origin`。

---

## 4. CSP

`apps/spa/index.html` の CSP:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.github.com %VITE_OAUTH_PROXY_URL%; img-src 'self' https://avatars.githubusercontent.com"
/>
```

主目的:

- 外部スクリプトの読み込み制限
- 接続先を GitHub API と OAuth Proxy に限定

---

## 5. OAuth Proxy セキュリティヘッダー

OAuth Proxy は主要レスポンスに以下を付与する。

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`

popup 応答 HTML はさらに:

- `Content-Security-Policy: default-src 'none'; script-src 'unsafe-inline'`

---

## 6. 入力検証

### 6.1 SPA

Action 作成/更新で `zod` 検証を実施。

- title: 1-256
- memo: 0-65536
- label: 1-50、空白/カンマ/引用符禁止
- labels: 最大10、重複不可

### 6.2 OAuth Proxy

- `SPA_ORIGIN` は URL 正規化して比較
- refresh body は JSON parse 失敗を 400 で返す

---

## 7. 権限境界

- SPA は `ato-datastore` リポジトリを前提に API を呼ぶ
- リポジトリ未設定時は `RepoNotConfiguredError` とセットアップ導線を表示
- `client_secret` は Workers Secrets 管理でソースコードに含めない

---

## 8. 運用チェックリスト

- [ ] `.dev.vars` をコミットしていない
- [ ] `VITE_OAUTH_PROXY_URL` が本番値
- [ ] Workers Secrets (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`) 設定済み
- [ ] `SPA_ORIGIN` が GitHub Pages origin と一致
- [ ] GitHub App callback URL が `/auth/callback` を指している
