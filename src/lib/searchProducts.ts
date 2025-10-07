import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { Product } from '@/types/product';
import { auth } from '@/auth';
import { normalizeQueryParam } from './utils';

export interface SearchParams {
  q?: string;
  category?: string;
  tags?: string | string[];
  negativeTags?: string | string[];
  sort?: string;
  order?: string;
}

export async function searchProducts(params: SearchParams): Promise<Product[]> {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    const whereConditions: Prisma.ProductWhereInput[] = [];

    if (params.q) {
      whereConditions.push({
        OR: [
          { title: { contains: params.q, mode: 'insensitive' } },
          { description: { contains: params.q, mode: 'insensitive' } },
        ],
      });
    }

    if (params.category) {
      whereConditions.push({
        productTags: {
          some: {
            tag: {
              name: params.category,
              tagCategory: { name: 'category' },
            },
          },
        },
      });
    }

    const tagNames = normalizeQueryParam(params.tags);
    if (tagNames && tagNames.length > 0) {
      whereConditions.push({
        AND: tagNames.map(tagName => ({
          productTags: {
            some: {
              tag: {
                name: tagName,
              },
            },
          },
        })),
      });
    }

    const negativeTagNames = normalizeQueryParam(params.negativeTags);
    if (negativeTagNames && negativeTagNames.length > 0) {
      whereConditions.push({
        NOT: {
          productTags: {
            some: {
              tag: {
                name: {
                  in: negativeTagNames,
                },
              },
            },
          },
        },
      });
    }

    const allowedSortKeys = ['createdAt', 'lowPrice', 'highPrice', 'viewCount', 'publishedAt'] as const;
    type SortKey = typeof allowedSortKeys[number];

    const orderBy: Prisma.ProductOrderByWithRelationInput = {};
    const sortKey = params.sort as SortKey;

    if (params.sort && allowedSortKeys.includes(sortKey)) {
      orderBy[sortKey] = params.order === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const products = await prisma.product.findMany({
      where: whereConditions.length > 0 ? { AND: whereConditions } : {},
      orderBy,
      include: {
        productTags: {
          include: {
            tag: true,
          },
        },
        images: {
          where: {
            isMain: true,
          },
          take: 1,
        },
        variations: {
          orderBy: {
            order: 'asc',
          },
        },
        likes: {
          where: { userId },
        },
        productOwners: {
          where: { userId },
        },
      },
    });

    return products.map(product => ({
      id: product.id,
      title: product.title,
      lowPrice: product.lowPrice,
      highPrice: product.highPrice,
      mainImageUrl: product.images.length > 0 ? product.images[0].imageUrl : null,
      tags: product.productTags.map(pt => pt.tag.name),
      variations: product.variations.map(v => ({
        id: v.id,
        name: v.name,
        price: v.price,
      })),
      isLiked: product.likes.length > 0,
      isOwned: product.productOwners.length > 0,
    }));

  } catch (error) {
    console.error('商品検索エラー:', error);
    throw new Error('商品の取得に失敗しました');
  }
}