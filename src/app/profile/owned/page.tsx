import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import ProductGrid from '@/components/ProductGrid';
import { Product } from '@/types/product';
import { redirect } from 'next/navigation';

export const metadata = {
  title: '所有済み商品',
};

async function getOwnedProducts(userId: string): Promise<Product[]> {
  const ownedProducts = await prisma.productOwner.findMany({
    where: { userId },
    orderBy: { product: { createdAt: 'desc' } },
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
                select: { 
                  name: true,
                  displayName: true,
                },
              },
            },
            take: 7,
          },
          variations: {
            orderBy: { order: 'asc' },
          },
          // We also need to know if the user has liked the products in their owned list
          likes: {
            where: { userId },
          },
        },
      },
    },
  });

  return ownedProducts.map(owner => {
    const p = owner.product;
    return {
      id: p.id,
      title: p.title,
      lowPrice: p.lowPrice,
      highPrice: p.highPrice,
      mainImageUrl: p.images.length > 0 ? p.images[0].imageUrl : null,
      tags: p.productTags.map(pt => pt.tag.displayName || pt.tag.name),
      isLiked: p.likes.length > 0,
      isOwned: true, // It's the owned list, so this is always true
      variations: p.variations.map(v => ({
        id: v.id,
        name: v.name,
        price: v.price,
      })),
    };
  });
}

export default async function OwnedPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/api/auth/signin?callbackUrl=/profile/owned');
  }

  const products = await getOwnedProducts(session.user.id);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">所有済み商品</h1>
      {products.length > 0 ? (
        <ProductGrid products={products} showLikeButton={true} showOwnButton={true} />
      ) : (
        <p>所有している商品はありません。</p>
      )}
    </div>
  );
}
