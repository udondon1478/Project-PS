import type { Metadata } from 'next';
import { BASE_URL } from '@/lib/constants';
import HomeClient from '@/app/HomeClient';
import { searchProducts } from '@/lib/searchProducts';

const PAGE_SIZE = 24;

export const metadata: Metadata = {
  title: 'PolySeek - VRChatアバター・衣装・ギミック検索',
  description:
    'VRChat向けの3Dアバターやアクセサリーをタグベースで検索できるプラットフォーム。',
  alternates: {
    canonical: BASE_URL,
  },
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const resolvedParams = await searchParams;
  const parsedPage = resolvedParams.page
    ? parseInt(resolvedParams.page, 10)
    : 1;
  const currentPage =
    Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  try {
    const { products: formattedProducts, total } = await searchProducts({
      page: currentPage,
      pageSize: PAGE_SIZE,
      sort: 'newest',
    });

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
      <HomeClient
        products={formattedProducts}
        totalPages={totalPages}
        currentPage={currentPage}
      />
    );
  } catch (error) {
    console.error('Top page fetch error:', error);
    // エラー時は空の状態を表示（またはエラー用コンポーネントがあればそれを使用）
    return (
      <HomeClient
        products={[]}
        totalPages={0}
        currentPage={1}
      />
    );
  }
}
