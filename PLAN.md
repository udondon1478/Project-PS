# Google Search Console ソフト404問題 - 修正仕様書

## 概要

Google Search Console で複数のページが「ソフト404」として報告され、インデックスに登録できない問題を修正する。

## 根本原因分析

### 原因1: robots.txt による API ブロック（トップページに影響）

**重大度: 高**

`robots.txt` が `/api/` パス全体をブロックしているため、Googlebot がクライアントサイドの API リクエストを実行できない。

```txt
# 現在の robots.txt
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /profile/
```

**影響を受けるリクエスト（Google Search Console で確認済み）:**
- `https://polyseek.jp/api/auth/session` → ブロック
- `https://polyseek.jp/api/products/latest?page=1&limit=24` → ブロック
- `https://polyseek.jp/api/tags/by-type?categoryNames=feature` → ブロック
- `https://polyseek.jp/api/tags/by-type?categoryNames=product_category` → ブロック
- `https://polyseek.jp/api/tags/by-type?categoryNames=rating` → ブロック

**結果:** トップページ（`/`）は `ClientHome` コンポーネントが `/api/products/latest` から商品データをクライアントサイドで fetch しているため、Googlebot には商品一覧が空の Suspense fallback（スケルトン）しか表示されない。

### 原因2: トップページが完全にクライアントサイドレンダリング（CSR）

**重大度: 高**

```tsx
// src/app/page.tsx - 現状
export default function Home() {
  return (
    <Suspense fallback={<ProductGridSkeleton count={24} />}>
      <ClientHome />  // "use client" - API経由で商品をfetch
    </Suspense>
  );
}
```

- `ClientHome` は `"use client"` コンポーネント
- `useEffect` で `/api/products/latest` を fetch
- サーバーサイドでは商品データがHTMLに含まれない
- robots.txt の API ブロックと組み合わさり、Googlebot は空のスケルトンのみ認識

### 原因3: 削除済み商品のサイトマップ残留

**重大度: 中**

- βテスト時に Google にインデックスされた商品が、正式リリース時のDB初期化で物理削除された
- サイトマップからは自動除外されるが、Google のインデックスにはまだ残っている
- 削除済み商品へのアクセスは `notFound()` で 404 を返すため、「ソフト404」ではなく正式な 404 となる
- 現在のコードでは正しく処理されている（`product` が `null` なら `notFound()` が呼ばれる）

### 原因4: AuthGuard のセッション依存

**重大度: 低**

`AuthGuard` は `useSession()` を使用し、`/api/auth/session` を呼び出す。robots.txt でブロックされているため、セッション取得が失敗する可能性がある。ただし、公開ページ（`/`, `/search`, `/products` 等）は `isPublicPage` 判定で `status === "loading"` 中もコンテンツを表示するため、直接の原因ではない。

---

## 決定事項

| 項目 | 決定 | 理由 | 備考 |
|------|------|------|------|
| トップページ | SSR化 | API依存を解消し、初期HTMLに商品データを含める | robots.txtブロックの影響を完全に排除 |
| robots.txt | `/api/` ブロック維持 | APIエンドポイントをクローラーに公開すべきでない | SSR化により不要になる |
| 削除済み商品 | 現状維持（404を返す） | 物理削除済み商品は `notFound()` で正しく404が返る | 将来の論理削除導入時に再検討 |
| サイトマップ | 改善検討 | 公開中の商品のみをリストする | 現状でも物理削除済みは自動除外 |

---

## 修正仕様

### 1. トップページ SSR化（`/src/app/page.tsx`）

#### 変更方針

- `page.tsx` を async サーバーコンポーネントに変更
- サーバーサイドで Prisma を使って商品データを直接取得
- 既存の `/api/products/latest/route.ts` のロジックを参考に、同等のクエリをサーバーコンポーネント内で実行
- `ClientHome` を「初期データを受け取って表示するクライアントコンポーネント」に変更

#### 具体的な変更

**`src/app/page.tsx`（サーバーコンポーネント化）:**

```tsx
import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { BASE_URL } from '@/lib/constants';
import HomeClient from '@/app/HomeClient';

const PAGE_SIZE = 24;

export const metadata: Metadata = {
  title: 'PolySeek - VRChatアバター・衣装・ギミック検索',
  description: 'VRChat向けの3Dアバターやアクセサリーをタグベースで検索できるプラットフォーム。',
  alternates: { canonical: BASE_URL },
};

export default async function Home({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const resolvedParams = await searchParams;
  const parsedPage = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;
  const currentPage = (Number.isInteger(parsedPage) && parsedPage > 0) ? parsedPage : 1;

  // サーバーサイドで直接DBから商品を取得
  const session = await auth();
  const userId = session?.user?.id;

  // 全年齢タグでフィルタリング（既存APIロジックと同等）
  const allAgeTag = await prisma.tag.findFirst({ ... });
  const where = allAgeTag ? { productTags: { some: { tagId: allAgeTag.id } } } : {};

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: PAGE_SIZE, include: { ... } }),
  ]);

  // Like/Own 状態もサーバーサイドで取得
  // フォーマットして props として渡す

  return (
    <HomeClient
      products={formattedProducts}
      totalPages={Math.ceil(total / PAGE_SIZE)}
      currentPage={currentPage}
    />
  );
}
```

**ページネーション方針: 全ページSSR**
- ページ遷移は `<Link href="/?page=2">` によるサーバーサイドナビゲーション
- 全ページで `searchParams` の `page` パラメータを読み取り、サーバーサイドでデータ取得
- Google がすべてのページをインデックス可能
- `ClientHome` → `HomeClient` にリネーム（旧CSRからの変更を明示）

**`src/app/HomeClient.tsx`（旧 ClientHome.tsx）:**
- `"use client"` コンポーネントとして維持（`ServiceIntroSection` が `useSession` を使用するため）
- props で受け取った商品データとページネーション情報を表示
- クライアントサイドの `useEffect` での fetch を削除
- `useState` による `products`, `loading`, `error` 状態管理を削除
- `Pagination` コンポーネントの `baseUrl` は `"/"` のまま

**重要な考慮事項:**
- `ServiceIntroSection` は `"use client"` コンポーネント（`useSession` 使用）→ そのまま維持
- 全年齢タグフィルターのロジックを維持する
- `isLiked` / `isOwned` の状態はサーバーサイドセッションで取得可能（`auth()` を使用）

#### SSR時の商品取得ロジック

`/api/products/latest/route.ts` から移植するロジック:
1. ページパラメータのバリデーション
2. `auth()` でセッション取得（ユーザーの Like/Own 状態用）
3. 全年齢タグ（`age_rating` カテゴリの `全年齢` タグ）でフィルタリング
4. `createdAt` 降順で商品取得
5. メイン画像、タグ（7件まで）、バリエーション、販売者情報を include
6. フォーマットして返却

### 2. トップページのメタデータ追加

現在、トップページには `layout.tsx` のデフォルトメタデータのみが適用されている。トップページ専用のメタデータを `page.tsx` に追加する。

```tsx
export const metadata: Metadata = {
  title: 'PolySeek - VRChatアバター・衣装・ギミック検索',
  description: 'VRChat向けの3Dアバターやアクセサリーをタグベースで検索できるプラットフォーム。',
  alternates: {
    canonical: BASE_URL,
  },
};
```

### 3. 商品詳細ページの確認（変更不要）

`/src/app/products/[productId]/page.tsx` は既にSSR化済み:
- サーバーサイドで Prisma から直接データ取得
- `product` が `null` の場合は `notFound()` で正式な 404 を返す
- `generateMetadata()` でメタデータを動的生成
- **変更不要** - 正しく実装されている

### 4. サイトマップの改善（オプション）

現在のサイトマップは全商品をリストしているが、以下を検討:
- `lastModified` の精度向上（`updatedAt` を使用中 → 適切）
- 将来の論理削除導入時に `where` 条件を追加

**現時点では変更不要** - 物理削除済み商品は自動的にサイトマップから除外される。

---

## 実装対象ファイル

| ファイル | 変更内容 |
|----------|----------|
| `/src/app/page.tsx` | SSR化 - async サーバーコンポーネントに変更、Prisma でデータ取得、メタデータ追加 |
| `/src/app/ClientHome.tsx` → `/src/app/HomeClient.tsx` | リネーム＆リファクタリング - props で商品データを受け取り表示のみ担当。クライアントサイド fetch を削除 |

---

## 実装ステップ

1. **トップページ SSR化**: `page.tsx` を async サーバーコンポーネントに変更し、Prisma で直接商品データを取得。メタデータも追加。
2. **HomeClient 作成**: `ClientHome.tsx` を `HomeClient.tsx` にリネームし、props で商品データを受け取る表示専用コンポーネントに変更。クライアントサイド fetch・useState・useEffect を削除。
3. **ページネーション SSR化**: `Pagination` コンポーネントの `baseUrl` を `"/"` で維持し、`/?page=N` へのリンクでサーバーサイドナビゲーション。
4. **テスト**: ローカルで動作確認（全ページで商品データがHTMLに含まれることを確認）
5. **デプロイ後**: Google Search Console で再クロールをリクエスト

---

## 参考: 現在の実装

- トップページ: `/src/app/page.tsx` → `ClientHome` (CSR)
- 商品取得API: `/src/app/api/products/latest/route.ts`
- 商品詳細: `/src/app/products/[productId]/page.tsx` (SSR済み)
- 検索ページ: `/src/app/search/page.tsx` (SSR済み)
- robots.txt: `/src/app/robots.ts`
- サイトマップ: `/src/app/sitemap.ts`
- 認証ガード: `/src/components/AuthGuard.tsx`
