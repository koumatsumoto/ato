# 05. SPA 設計

## 概要

ATO は React 19 + Vite 8 の単一ページアプリケーション。
GitHub Issues をデータソースとし、「やること (Action)」を管理する。

主な責務:

- 認証状態管理
- Action 一覧/詳細/更新
- 検索 (キーワード + ラベル + 完了含む)
- 共有導線 (`/share`)
- 診断ログ表示 (`/diagnostics`)

## 1. ルーティング

| Path           | Page              | 認証 | 用途                               |
| -------------- | ----------------- | ---- | ---------------------------------- |
| `/`            | `MainPage`        | 必須 | 未完了一覧 + 追加 + 検索           |
| `/actions/:id` | `DetailPage`      | 必須 | タイトル/メモ/ラベル編集、完了切替 |
| `/share`       | `SharePage`       | 必須 | Web Share Target 受け取り          |
| `/diagnostics` | `DiagnosticsPage` | 必須 | 認証ログ診断                       |
| `/login`       | `LoginPage`       | 不要 | 認証開始                           |

実装: `src/app/router.tsx`

## 2. 画面構成

### 2.1 MainPage

`src/app/pages/MainPage.tsx`

- `useOpenActions()` で open 一覧取得
- 検索入力時は `useSearchActions()` に切替
- `RepoNotConfiguredError` 時は `SetupGuide` を表示
- 通常エラーは `ErrorBanner`
- 末尾固定の `ActionAddForm` で新規追加

### 2.2 DetailPage

`src/app/pages/DetailPage.tsx`

- `useAction(id)` で単体取得
- 完了/未完了切替 (`useCloseAction`, `useReopenAction`)
- `useAutoSave` で 3 秒デバウンス自動保存
- ネットワーク失敗時は下書きを `ato:draft:{id}` に保存
- 次回表示で `useDraftRestoration` が新しい下書きを復元

### 2.3 SharePage

`src/app/pages/SharePage.tsx`

- クエリ (`title`, `text`, `url`) を受けて Action を自動生成
- タイトルは `読む：...` 形式で 256 文字に制限
- ラベル `あとで読む` を自動付与

### 2.4 DiagnosticsPage

`src/app/pages/DiagnosticsPage.tsx`

- React state と localStorage の token 有無を可視化
- 認証イベントログ (`auth-log`) を表示/クリア
- `__APP_VERSION__` を表示

## 3. 状態管理

### 3.1 Query 管理

`src/app/providers.tsx`

- QueryClient をアプリ全体で共有
- `AuthError` / `TokenRefreshError` で token を整理
- Query retry ルール:
  - `AuthError`: retry しない
  - `GitHubApiError(403/404/422)`: retry しない
  - それ以外: 最大 2 回

### 3.2 認証状態

`src/features/auth/hooks/use-auth.tsx`

- token は `localStorage` 基準
- `login()` は popup 認証を実行
- `logout()` は token 一式削除
- token clear/refresh イベントで UI を同期

## 4. データアクセス

### 4.1 GitHub API クライアント

`src/shared/lib/github-client.ts`

- 全 API に `Authorization: Bearer` を付与
- 401 で refresh を試行
- レート制限 (`403 + X-RateLimit-Remaining=0` または `429`) を `RateLimitError` 化

### 4.2 Actions API

`src/features/actions/lib/github-api.ts`

- `fetchActions` (open/closed + pagination)
- `createAction`
- `fetchAction`
- `updateAction`
- `closeAction` / `reopenAction`

### 4.3 検索 API

`src/features/actions/lib/search-api.ts`

- GitHub Search API 利用
- クエリは `repo:{login}/ato-datastore is:issue ...`
- ラベル指定時は二重引用符をサニタイズ

## 5. GitHub Pages 対応

- `vite.config.ts`: `base: "/ato/"`
- `public/404.html`: `/ato/?redirect=...` へ遷移
- `main.tsx`: `redirect` クエリを復元して `history.replaceState`

## 6. ファイル構成

```text
src/
  app/
  features/
  shared/

tests/
  app/
  features/
  shared/
```
