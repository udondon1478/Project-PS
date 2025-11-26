import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import ProductGrid from '@/components/ProductGrid';
import { Product } from '@/types/product';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'いいねした商品',
};

async function getLikedProducts(userId: string): Promise<Product[]> {
  const likedProducts = await prisma.productLike.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      product: {
        include: {
          images: {
            where: { isMain: true },
            select: { imageUrl: true },
            take: 1,
          },
          productTags: {
            include: {
              tag: {
                select: { name: true },
              },
            },
            take: 7,
          },
          variations: {
            orderBy: { order: 'asc' },
          },
          // We also need to know if the user owns the products in their liked list
          productOwners: {
            where: { userId },
          },
        },
      },
    },
  });

  return likedProducts.map(like => {
    const p = like.product;
    return {
      id: p.id,
      title: p.title,
      lowPrice: p.lowPrice,
      highPrice: p.highPrice,
      mainImageUrl: p.images.length > 0 ? p.images[0].imageUrl : null,
      tags: p.productTags.map(pt => pt.tag.name),
      isLiked: true, // It's the liked list, so this is always true
      isOwned: p.productOwners.length > 0,
      variations: p.variations.map(v => ({
        id: v.id,
        name: v.name,
        price: v.price,
      })),
    };
  });
}

export default async function LikesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/api/auth/signin?callbackUrl=/profile/likes');
  }

  const products = await getLikedProducts(session.user.id);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">いいねした商品</h1>
      {products.length > 0 ? (
        <ProductGrid products={products} showLikeButton={true} showOwnButton={true} />
      ) : (
        <p>いいねした商品はありません。</p>
      )}
    </div>
  );
}
