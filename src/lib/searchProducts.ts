import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { Product } from '@/types/product';
import { auth } from '@/auth';
import { normalizeQueryParam } from './utils';

/**
 * 商品検索のパラメータを定義します。
 */
export interface SearchParams {
  /** 検索キーワード。商品のタイトルや説明に含まれる文字列。 */
  q?: string;
  /** 検索対象のカテゴリ名。 */
  category?: string;
  /** 検索に含めるタグの配列。指定されたタグをすべて持つ商品が対象。 */
  tags?: string | string[];
  /** 検索から除外するタグの配列。指定されたタグを持つ商品は除外される。 */
  negativeTags?: string | string[];
  /** 並び替えの基準となるキー。 */
  sort?: string;
  /** 並び替えの順序 ('asc' または 'desc')。 */
  order?: string;
}

export async function searchProducts(params: SearchParams): Promise<Product[]> {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    const tagNames = normalizeQueryParam(params.tags);
    const negativeTagNames = normalizeQueryParam(params.negativeTags);

    // タグの衝突を検証
    if (tagNames && negativeTagNames) {
      const intersection = tagNames.filter(tag => negativeTagNames.includes(tag));
      if (intersection.length > 0) {
        throw new Error(`検索条件エラー: タグ '${intersection.join(', ')}' は検索条件と除外条件の両方に含まれています。`);
      }
    }

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
    // カスタムバリデーションエラーはそのままスローする
    if (error instanceof Error && error.message.startsWith('検索条件エラー:')) {
      throw error;
    }
    console.error('商品検索エラー:', error);
    throw new Error('商品の取得に失敗しました');
  }
}