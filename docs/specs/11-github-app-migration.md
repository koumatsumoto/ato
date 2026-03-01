# 11. GitHub App 移行記録

## ステータス

GitHub App ベースの運用に移行済み。
本ドキュメントは計画書ではなく、移行結果の記録である。

---

## 1. 移行で確定した方針

- 認証連携は OAuth Proxy 経由で実施
- token 交換先は `https://github.com/login/oauth/access_token`
- `scope=repo` 前提の旧設計は廃止
- SPA 側は refresh token 対応済み
- `ato-datastore` は自動作成せず、未作成時はセットアップ導線を表示

---

## 2. 実装反映済み項目

### 2.1 OAuth Proxy

- `/auth/login`, `/auth/callback`, `/auth/refresh`, `/auth/health` を提供
- callback で refresh token 系フィールドを postMessage に含める
- refresh endpoint で Origin 検証を実施

### 2.2 SPA

- token store が refresh token / expiry を保持
- `githubFetch` が 401 時に refresh -> retry を実施
- `SetupGuide` で repo 作成 + GitHub App インストールを案内

### 2.3 CI/CD

- CI 成功後の `workflow_run` で deploy 実行
- Node 24 系 (`node-version: "24"`) へ統一

---

## 3. 影響のあった仕様

- `03-oauth-proxy.md`: refresh 追加
- `04-auth-flow.md`: refresh フロー追加
- `05-spa-design.md`: Action モデルへ統一
- `06-data-model.md`: localStorage スキーマ更新
- `09-ci-cd.md`: `workflow_run` 構成へ更新

---

## 4. 運用上の注意

- GitHub App の callback URL は OAuth Proxy の `/auth/callback`
- Workers Secrets の更新漏れは認証失敗の主因
- `SPA_ORIGIN` と実際の Pages origin が不一致だと refresh が 403 になる
