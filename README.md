# ATO

あとでやることを残すメモアプリ。GitHub Issues をバックエンドに使用する single-app repository。

## アーキテクチャ

| コンポーネント   | 説明                     | デプロイ先         |
| ---------------- | ------------------------ | ------------------ |
| `src/`           | React 19 SPA             | GitHub Pages       |
| `gh-auth-bridge` | 共有 GitHub OAuth bridge | Cloudflare Workers |

## 必要環境

- Node.js >= 24.13.0
- pnpm >= 10.0.0

## セットアップ

```bash
git clone <repo-url> && cd ato
pnpm install
```

認証基盤は公開リポジトリ
[`gh-auth-bridge`](https://github.com/koumatsumoto/gh-auth-bridge)
の Cloudflare Worker を利用する。

## 開発コマンド

```bash
pnpm dev
pnpm build
pnpm test
pnpm test:coverage
pnpm lint
pnpm typecheck
pnpm format
```

## プロジェクト構成

```text
ato/
  src/            # React 19 SPA
  tests/          # Vitest
  public/         # 静的アセット
  docs/           # 設計メモと運用ガイド
```
