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
| `/`            | `MainPage`        | 必須 | 即時追加 + 音声入力 + 未完了一覧   |
| `/actions/:id` | `DetailPage`      | 必須 | タイトル/メモ/ラベル編集、完了切替 |
| `/share`       | `SharePage`       | 必須 | Web Share Target 受け取り          |
| `/diagnostics` | `DiagnosticsPage` | 必須 | 認証ログ診断                       |
| `/login`       | `LoginPage`       | 不要 | 認証開始                           |

実装: `src/app/router.tsx`

## 2. 画面構成

### 2.1 MainPage

`src/app/pages/MainPage.tsx`

- 先頭の `ActionAddForm` は、認証 identity と一覧の読み込みを待たずに下書きを入力できる
- 追加時は repository の存在確認を行い、成功後にだけ下書きを消去する
- Web Speech API 対応ブラウザでは、日本語の認識結果を編集可能な下書きへ追記する
- 一覧、検索、並び替えは `ActionListSection` として遅延読み込みする
- `useOpenActions()` で open 一覧を取得し、検索時は `useSearchActions()` に切り替える
- `RepoNotConfiguredError` 時は、composer を維持したまま `SetupGuide` を表示する
- 通常エラーは `ErrorBanner` を表示する

音声認識は progressive enhancement であり、非対応、権限拒否、認識失敗時もキーボード入力を維持する。途中結果は状態表示にだけ使い、final result を現在の下書きへ追記する。音声認識だけでは保存せず、利用者による「追加」を必要とする。

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

### 2.5 初期表示

- `index.html` は、Manifest と同じ背景色で軽量な composer shell を最初に描画する
- token がある場合、`AuthGuard` は identity 取得中も保護された画面を描画する
- 一覧、検索、並び替え専用 UI は component 単位で遅延読み込みする
- identity 取得前に描画するのは TOP だけとし、共有や詳細など identity に依存する route は従来どおり取得完了を待つ
- Android Chrome が生成する splash の表示時間はアプリから指定せず、最初の paint までのアプリ側処理を減らす

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
- token は同期的に復元され、GitHub identity は非同期に取得する。identity 取得中も TOP の下書き入力は可能だが、保存操作は identity 確定まで無効になる

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

一覧取得と新規作成は、同じ repository readiness 確認を前提にする。同時に確認が必要になった場合は in-flight Promise を共有し、GitHub API への重複リクエストを避ける。新規作成は一覧取得の実行有無に依存しない。

### 4.3 検索 API

`src/features/actions/lib/search-api.ts`

- GitHub Search API 利用
- クエリは `repo:{login}/ato-datastore is:issue ...`
- ラベル指定時は二重引用符をサニタイズ

## 5. 音声入力

`src/features/actions/lib/speech-recognition.ts` と `use-speech-recognition.ts` がブラウザ API を隔離する。

- `SpeechRecognition` または `webkitSpeechRecognition` を feature detection する
- `ja-JP`、単発認識、interim result 有効で開始する
- 状態は `idle`、`requesting`、`listening`、`finalizing`、`error`
- cancel、error、unmount では認識 session を停止し、既存下書きを保持する
- 自動正規化は空白、制御文字、同一句読点の重複、256文字上限だけに限定する
- filler 除去、言い直し解釈、文章生成、外部 AI API は行わない

ブラウザによって音声が外部の認識サービスへ送信される場合がある。ATO は音声データを保存しない。

## 6. GitHub Pages 対応

- `vite.config.ts`: `base: "/ato/"`
- `public/404.html`: `/ato/?redirect=...` へ遷移
- `main.tsx`: `redirect` クエリを復元して `history.replaceState`

## 7. ファイル構成

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
