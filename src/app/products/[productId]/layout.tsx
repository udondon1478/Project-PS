import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { BASE_URL } from '@/lib/constants';

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
      productDescription = product.description?.substring(0, 150) || "PolySeekで公開されている商品です。"; // 説明文は適度な長さでカット
      if (product.images.length > 0) {
        productImages = product.images.map(img => img.imageUrl);
      }
    }
  } catch (error) {
    console.error("Failed to fetch product for metadata:", error);
  }

  /* productUrlの生成 */
  const productUrl = `${BASE_URL}/products/${productId}`;

  return {
    title: productTitle,
    description: productDescription,
    alternates: {
      canonical: productUrl,
    },
    openGraph: {
      title: productTitle,
      description: productDescription,
      images: productImages,
      type: 'website',
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