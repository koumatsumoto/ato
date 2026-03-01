# @ato/spa

ATO の SPA フロントエンド。

## 技術スタック

- React 19
- TypeScript 5
- Vite 6
- TailwindCSS 4
- React Router 7
- TanStack Query 5
- zod 3

---

## 開発コマンド

```bash
# ルートで実行
pnpm --filter @ato/spa dev
pnpm --filter @ato/spa typecheck
pnpm --filter @ato/spa lint
pnpm --filter @ato/spa test
pnpm --filter @ato/spa test:coverage
pnpm --filter @ato/spa build
pnpm --filter @ato/spa preview
```

---

## 主要構成

```text
src/
  app/
    pages/
      MainPage.tsx
      DetailPage.tsx
      SharePage.tsx
      DiagnosticsPage.tsx
      LoginPage.tsx
    router.tsx
    providers.tsx
  features/
    actions/
    auth/
  shared/
```

---

## 実装メモ

- `base: "/ato/"` (GitHub Pages)
- `public/404.html` + `main.tsx` で SPA fallback リダイレクト復元
- `/auth/*` は Vite proxy 経由で `localhost:8787` に転送
- GitHub API (`api.github.com`) はブラウザから直接呼び出す
