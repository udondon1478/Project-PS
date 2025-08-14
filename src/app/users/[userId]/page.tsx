import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import UserProductList from '@/components/profile/UserProductList';
import { Product } from '@/types/product';

type Props = {
  params: Promise<{
    userId: string;
  }>;
};

export default async function UserProfilePage({ params }: Props) {
  const { userId } = await params; // Await the promise here

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      products: {
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          images: {
            where: { isMain: true },
            take: 1,
          },
          productTags: {
            include: {
              tag: true,
            },
          },
          variations: true,
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  // Map Prisma products to the Product type expected by components
  const formattedProducts: Product[] = user.products.map(p => ({
    id: p.id,
    title: p.title,
    lowPrice: p.lowPrice,
    highPrice: p.highPrice,
    mainImageUrl: p.images.length > 0 ? p.images[0].imageUrl : null,
    tags: p.productTags.map(pt => pt.tag.name),
    variations: p.variations,
  }));

  return (
    <div className="container mx-auto px-4 py-8 pt-40">
      <div className="flex items-center space-x-4 mb-8">
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name ?? 'User profile picture'}
            width={128}
            height={128}
            className="w-32 h-32 rounded-full"
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-gray-500">No Image</span>
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold">{user.name ?? 'Anonymous User'}</h1>
          <p className="text-gray-600">アカウント登録日 {new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <h2 className="text-2xl font-semibold mt-8 border-b pb-2 mb-4">登録商品</h2>
      <UserProductList products={formattedProducts} />
    </div>
  );
}
