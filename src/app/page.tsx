import type { Metadata } from 'next';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { BASE_URL } from '@/lib/constants';
import HomeClient from '@/app/HomeClient';
import type { Product } from '@/types/product';

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
  const skip = (currentPage - 1) * PAGE_SIZE;

  const session = await auth();
  const userId = session?.user?.id;

  let userLikedProducts: string[] = [];
  let userOwnedProducts: string[] = [];

  if (userId) {
    const [liked, owned] = await Promise.all([
      prisma.productLike.findMany({
        where: { userId },
        select: { productId: true },
      }),
      prisma.productOwner.findMany({
        where: { userId },
        select: { productId: true },
      }),
    ]);
    userLikedProducts = liked.map((p) => p.productId);
    userOwnedProducts = owned.map((p) => p.productId);
  }

  const allAgeTag = await prisma.tag.findFirst({
    where: {
      name: '全年齢',
      tagCategory: {
        name: 'age_rating',
      },
    },
    select: {
      id: true,
    },
  });

  const whereConditions: Prisma.ProductWhereInput[] = [];

  if (allAgeTag) {
    whereConditions.push({
      productTags: {
        some: {
          tagId: allAgeTag.id,
        },
      },
    });
  }

  const where =
    whereConditions.length > 0 ? { AND: whereConditions } : {};

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: PAGE_SIZE,
      include: {
        images: {
          where: {
            isMain: true,
          },
          select: {
            imageUrl: true,
          },
          take: 1,
        },
        productTags: {
          include: {
            tag: {
              select: {
                name: true,
                displayName: true,
                tagCategory: {
                  select: {
                    color: true,
                  },
                },
              },
            },
          },
          take: 7,
        },
        variations: {
          orderBy: {
            order: 'asc',
          },
        },
        seller: true,
      },
    }),
  ]);

  const formattedProducts: Product[] = products.map((product) => ({
    id: product.id,
    title: product.title,
    lowPrice: product.lowPrice,
    highPrice: product.highPrice,
    mainImageUrl:
      product.images.length > 0 ? product.images[0].imageUrl : null,
    tags: product.productTags.map((pt) => ({
      name: pt.tag.displayName || pt.tag.name,
      categoryColor: pt.tag.tagCategory?.color || null,
    })),
    variations: product.variations.map((v) => ({
      id: v.id,
      name: v.name,
      price: v.price,
    })),
    isLiked: userId
      ? userLikedProducts.includes(product.id)
      : false,
    isOwned: userId
      ? userOwnedProducts.includes(product.id)
      : false,
    seller: product.seller
      ? {
          name: product.seller.name,
          iconUrl: product.seller.iconUrl,
          sellerUrl: product.seller.sellerUrl,
        }
      : null,
  }));

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <HomeClient
      products={formattedProducts}
      totalPages={totalPages}
      currentPage={currentPage}
    />
  );
}
