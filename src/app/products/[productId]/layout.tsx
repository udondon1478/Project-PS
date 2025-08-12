import { Metadata } from 'next';
import { prisma } from '@/lib_prisma/prisma';

export async function generateMetadata({ params }: { params: Promise<{ productId: string }> }): Promise<Metadata> {
  const { productId } = await params;
  let productTitle = "商品詳細"; // デフォルトタイトル

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { title: true },
    });
    if (product) {
      productTitle = product.title;
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