import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

export async function generateMetadata({ params }: { params: Promise<{ productId: string }> }): Promise<Metadata> {
  const { productId } = await params;
  let productTitle = "商品詳細"; // デフォルトタイトル
  let productDescription = "";
  let productImages: string[] = [];

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        title: true,
        description: true,
        images: {
          orderBy: [
             { isMain: 'desc' }, // メイン画像を最優先
             { order: 'asc' },   // 次に表示順
          ],
          select: { imageUrl: true },
          take: 1, // OGPには1枚あれば十分だが、複数設定も可能。まずはメイン1枚
        },
      },
    });

    if (product) {
      productTitle = product.title;
      productDescription = product.description?.substring(0, 150) || ""; // 説明文は適度な長さでカット
      if (product.images.length > 0) {
        productImages = product.images.map(img => img.imageUrl);
      }
    }
  } catch (error) {
    console.error("Failed to fetch product for metadata:", error);
  }

  /* productUrlの生成 */
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://polyseek.jp';
  const productUrl = `${baseUrl}/products/${productId}`;

  return {
    title: productTitle,
    description: productDescription,
    openGraph: {
      title: productTitle,
      description: productDescription,
      images: productImages,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: 'product' as const as any,
      url: productUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title: productTitle,
      description: productDescription,
      images: productImages,
    },
  };
}

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}