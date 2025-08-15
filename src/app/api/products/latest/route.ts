import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib_prisma/prisma';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    let userLikedProducts: string[] = [];
    let userOwnedProducts: string[] = [];

    if (userId) {
      const liked = await prisma.productLike.findMany({
        where: { userId },
        select: { productId: true },
      });
      userLikedProducts = liked.map((p) => p.productId);

      const owned = await prisma.productOwner.findMany({
        where: { userId },
        select: { productId: true },
      });
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

    const products = await prisma.product.findMany({
      where: whereConditions.length > 0 ? { AND: whereConditions } : {},
      orderBy: {
        createdAt: 'desc',
      },
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
      },
    });

    const formattedProducts = products.map((product) => ({
      id: product.id,
      title: product.title,
      lowPrice: product.lowPrice,
      highPrice: product.highPrice,
      mainImageUrl: product.images.length > 0 ? product.images[0].imageUrl : null,
      tags: product.productTags.map((pt) => pt.tag.name),
      variations: product.variations.map((v) => ({
        id: v.id,
        name: v.name,
        price: v.price,
      })),
      isLiked: userId ? userLikedProducts.includes(product.id) : false,
      isOwned: userId ? userOwnedProducts.includes(product.id) : false,
    }));

    return NextResponse.json(formattedProducts);
  } catch (error) {
    console.error('Error fetching latest products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
