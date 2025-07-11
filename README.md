This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Recent Changes

`npm run build` 時に発生していた複数の型エラーとビルドエラーを解決しました。主な変更点は以下の通りです。

*   **`src/app/api/products/[productId]/route.ts`**: `GET` 関数の `params` 引数の型を `Promise` でラップするように修正しました。
*   **`src/app/api/admin/tag-types/route.ts`**: `Tag` モデルに存在しない `type` プロパティを参照していた問題を修正し、`TagCategory` モデルからカテゴリ名を取得するように変更しました。
*   **`src/app/api/admin/tags/route.ts`**: `Tag` モデルに存在しない `type` プロパティを参照していた `where` 句と `select` 句、および `POST`/`PUT` メソッドの `type` 参照を修正しました。また、`Prisma` 名前空間のインポートを追加しました。
*   **`src/app/api/categories/route.ts`**: `Category` モデルに存在しない `category` プロパティを参照していた問題を修正し、`TagCategory` モデルからカテゴリを取得するように変更しました。
*   **`src/app/api/items/update/route.ts`**: 新しいタグを作成する際に `Tag` モデルに存在しない `type`, `category`, `color` プロパティを設定しようとしていた問題を修正し、デフォルトの `general` カテゴリを `upsert` で作成し、その `id` を `tagCategoryId` として使用するように変更しました。
*   **`src/components/admin/TagForm.tsx`**: `Tag` モデルに存在しない `type` プロパティを参照していた問題を修正し、`isNewType` 状態と `handleCheckboxChange` 関数、および関連するUI要素を削除しました。
*   **`src/components/theme-provider.tsx`**: `next-themes/dist/types` からの `ThemeProviderProps` のインポートパスを `next-themes` から直接インポートするように修正しました。
*   **`src/app/search/page.tsx`**: `useSearchParams()` の使用によるビルドエラーを解決するため、`src/components/search/SearchContent.tsx` を削除し、`src/app/search/page.tsx` をサーバーコンポーネントとして `searchParams` prop を `Promise` で受け取るように修正しました。また、未使用の `redirect` インポートを削除しました。
*   **`src/components/Header.tsx`**: `ProductSearch` コンポーネントが `useSearchParams` を使用していることによるビルドエラーを解決するため、`ProductSearch` を `<Suspense>` でラップし、`Suspense` を `react` からインポートするように修正しました。
*   **`src/app/dev/page.tsx`**: 開発専用ページであり、ビルド時に `fetch failed` エラーを引き起こしていたため、このファイルを削除しました。
