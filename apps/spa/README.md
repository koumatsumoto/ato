# @ato/spa

ATO の SPA フロントエンド。React 19 + Vite 6 + TailwindCSS 4 で構築。

## 技術スタック

- React 19
- TypeScript 5
- Vite 6
- TailwindCSS 4
- React Router 7
- TanStack Query 5
- zod 3

## セットアップ

```bash
# プロジェクトルートで
pnpm install
```

## 開発コマンド

```bash
# 開発サーバー起動 (http://localhost:5173)
pnpm dev

# TypeScript 型チェック
pnpm --filter @ato/spa typecheck

# Lint
pnpm --filter @ato/spa lint

# テスト実行
pnpm --filter @ato/spa test

# テスト (watch モード)
pnpm --filter @ato/spa test:watch

# テストカバレッジ
pnpm --filter @ato/spa test:coverage

# ビルド
pnpm --filter @ato/spa build

# プレビュー
pnpm --filter @ato/spa preview
```

## ディレクトリ構成

```text
src/
  main.tsx              # エントリポイント
  globals.css           # TailwindCSS
  app/
    App.tsx             # ルートコンポーネント
  features/
    auth/               # 認証機能
    todos/              # TODO 機能
  shared/
    components/         # 共通コンポーネント
    lib/                # 共通ユーティリティ
    __tests__/          # テストセットアップ
  types/                # 型定義
```

## 開発時の注意

- `/auth/*` へのリクエストは Vite proxy 経由で OAuth Proxy (`localhost:8787`) に転送される
- GitHub API (`api.github.com`) は SPA から直接呼び出し
- `@/*` パスエイリアスで `src/` 配下を参照可能
