import { Metadata } from 'next';

interface ProductDetail {
  id: string;
  title: string;
}

export async function generateMetadata({ params }: { params: { productId: string } }): Promise<Metadata> {
  const productId = params.productId;
  let productTitle = "商品詳細"; // デフォルトタイトル

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${productId}`, {
      cache: 'no-store', // 常に最新のデータを取得
    });
    if (response.ok) {
      const data: ProductDetail = await response.json();
      productTitle = data.title;
    }
  } catch (error) {
    console.error("Failed to fetch product for metadata:", error);
  }

  return {
    title: productTitle,
  };
}

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}