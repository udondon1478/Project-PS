import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedPage = parseInt(searchParams.get('page') || '1', 10);
    const parsedLimit = parseInt(searchParams.get('limit') || '24', 10);

    const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const limit = Number.isNaN(parsedLimit) || parsedLimit < 1 ? 24 : Math.min(parsedLimit, 100);
    const skip = (page - 1) * limit;

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

    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
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

    const formattedProducts = products.map((product) => ({
      id: product.id,
      title: product.title,
      lowPrice: product.lowPrice,
      highPrice: product.highPrice,
      mainImageUrl: product.images.length > 0 ? product.images[0].imageUrl : null,
      tags: product.productTags.map((pt) => pt.tag.displayName || pt.tag.name),
      variations: product.variations.map((v) => ({
        id: v.id,
        name: v.name,
        price: v.price,
      })),
      isLiked: userId ? userLikedProducts.includes(product.id) : false,
      isOwned: userId ? userOwnedProducts.includes(product.id) : false,
      seller: product.seller
        ? {
            name: product.seller.name,
            iconUrl: product.seller.iconUrl,
            sellerUrl: product.seller.sellerUrl,
          }
        : null,
    }));

    return NextResponse.json({
      products: formattedProducts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching latest products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
