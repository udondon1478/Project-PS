import { NextResponse } from 'next/server';
import { prisma } from '@/lib_prisma/prisma';


export async function GET() {
  try {
    const products = await prisma.product.findMany({
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
      },
    });

    // Format the response data
    const formattedProducts = products.map((product) => ({
      id: product.id,
      title: product.title,
      lowPrice: product.lowPrice, // price を lowPrice に変更
      mainImageUrl: product.images.length > 0 ? product.images[0].imageUrl : null,
      tags: product.productTags.map((pt) => pt.tag.name),
    }));

    return NextResponse.json(formattedProducts);
  } catch (error) {
    console.error('Error fetching latest products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}