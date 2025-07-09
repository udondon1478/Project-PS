import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client'; // Prismaをインポート
import { prisma } from '@/lib_prisma/prisma';


export async function GET() {
  try {
    const allAgeTag = await prisma.tag.findFirst({
      where: {
        name: "全年齢",
        tagCategory: {
          name: "age_rating",
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
          take: 1, // Assuming only one main image per product
        },
        productTags: {
          include: {
            tag: {
              select: {
                name: true,
              },
            },
          },
          take: 7, // Limit to 7 tags
        },
        variations: { // バリエーション情報を含める
          orderBy: {
            order: 'asc', // 表示順序でソート
          },
        },
      },
    });

    // Format the response data
    const formattedProducts = products.map((product) => ({
      id: product.id,
      title: product.title,
      lowPrice: product.lowPrice,
      highPrice: product.highPrice, // highPriceも追加
      mainImageUrl: product.images.length > 0 ? product.images[0].imageUrl : null,
      tags: product.productTags.map((pt) => pt.tag.name),
      variations: product.variations.map(v => ({ // バリエーション情報を追加
        id: v.id,
        name: v.name,
        price: v.price,
      })),
    }));

    return NextResponse.json(formattedProducts);
  } catch (error) {
    console.error('Error fetching latest products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}