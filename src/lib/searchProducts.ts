import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { Product } from '@/types/product';
import { auth } from '@/auth';
import { normalizeQueryParam } from './utils';

export interface SearchParams {
  tags?: string | string[];
  ageRatingTags?: string | string[];
  categoryTagId?: string;
  featureTagIds?: string | string[];
  negativeTags?: string | string[];
  minPrice?: string;
  maxPrice?: string;
  liked?: string;
  owned?: string;
  isHighPrice?: string;
}

/**
 * Searches products using multiple optional filters and returns formatted Product objects.
 *
 * Performs user-aware filtering (likes/ownership) when a session exists, resolves age-rating tags
 * (falling back to the "全年齢" tag when none specified), normalizes query parameters, applies
 * tag inclusion/exclusion, feature/category tag ID filtering, optional price range (supports a
 * special `isHighPrice` mode that forces minPrice=10000 and maxPrice=100000), and returns results
 * ordered by newest first with main image, tags, and variations included.
 *
 * @param params - Search parameters (see SearchParams). Notable behaviors:
 *   - `isHighPrice='true'` overrides parsed min/max prices to the high-price range.
 *   - `liked='true'` / `owned='true'` filter by the current user's likes/ownership when authenticated.
 *   - `ageRatingTags` are resolved to tag IDs under the `age_rating` category; if none provided or
 *     none match, the function requires the "全年齢" age-rating tag when present.
 * @returns An array of Product objects matching the filters.
 * @throws Error with message '商品の取得に失敗しました' if the search fails.
 */
export async function searchProducts(params: SearchParams): Promise<Product[]> {
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

    const {
      tags: tagsParam,
      negativeTags: negativeTagsParam,
      ageRatingTags: ageRatingTagsParam,
      categoryTagId,
      featureTagIds: featureTagIdsParam,
      minPrice: minPriceParam,
      maxPrice: maxPriceParam,
      isHighPrice: isHighPriceParam,
      liked: likedParam,
      owned: ownedParam,
    } = params;

    const parseAndValidatePrice = (priceStr: string | undefined): number | undefined => {
      if (priceStr === undefined) {
        return undefined;
      }
      const price = parseInt(priceStr, 10);
      if (Number.isNaN(price)) {
        return undefined;
      }
      return Math.max(0, price);
    };

    let minPrice = parseAndValidatePrice(minPriceParam);
    let maxPrice = parseAndValidatePrice(maxPriceParam);

    if (isHighPriceParam === 'true') {
      minPrice = 10000;
      maxPrice = 100000;
    }

    const tagNames = normalizeQueryParam(tagsParam);
    const negativeTagNames = normalizeQueryParam(negativeTagsParam);
    const featureTagIds = normalizeQueryParam(featureTagIdsParam);

    const whereConditions: Prisma.ProductWhereInput[] = [];

    let ageRatingTagIds: string[] = [];
    const ageRatingTags = normalizeQueryParam(ageRatingTagsParam);
    if (ageRatingTags.length > 0) {
      const tags = await prisma.tag.findMany({
        where: {
          name: {
            in: ageRatingTags,
          },
          tagCategory: {
            name: "age_rating",
          },
        },
        select: {
          id: true,
        },
      });
      ageRatingTagIds = tags.map(tag => tag.id);
    }

    const tagIdSet = new Set(featureTagIds);
    if (categoryTagId) {
      tagIdSet.add(categoryTagId);
    }
    const tagIdsToFilter = [...tagIdSet];

    if (ageRatingTagIds.length > 0) {
      whereConditions.push({
        productTags: {
          some: {
            tagId: {
              in: ageRatingTagIds,
            },
          },
        },
      });
    } else {
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

      if (allAgeTag) {
        whereConditions.push({
          productTags: {
            some: {
              tagId: allAgeTag.id,
            },
          },
        });
      }
    }

    if (tagNames.length > 0) {
      whereConditions.push({
        AND: tagNames.map(tagName => ({
          productTags: {
            some: {
              tag: {
                name: tagName
              }
            }
          }
        }))
      });
    }

    if (negativeTagNames.length > 0) {
      whereConditions.push({
        AND: negativeTagNames.map(negativeTagName => ({
          productTags: {
            none: {
              tag: {
                name: negativeTagName
              }
            }
          }
        }))
      });
    }

    if (tagIdsToFilter.length > 0) {
       whereConditions.push({
         AND: tagIdsToFilter.map(tagId => ({
           productTags: {
             some: {
               tagId: tagId
             }
           }
         }))
       });
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceCondition: Prisma.ProductWhereInput = {};
      if (minPrice !== undefined) {
        priceCondition.highPrice = { gte: minPrice };
      }
      if (maxPrice !== undefined) {
        if (maxPrice !== 100000) {
          priceCondition.lowPrice = { lte: maxPrice };
        }
      }
      whereConditions.push(priceCondition);
    }

    if (userId && likedParam === 'true') {
      whereConditions.push({
        likes: {
          some: {
            userId: userId,
          },
        },
      });
    }

    if (userId && ownedParam === 'true') {
      whereConditions.push({
        productOwners: {
          some: {
            userId: userId,
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
      },
    });

    const formattedProducts: Product[] = products.map(product => ({
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
      isLiked: userId ? userLikedProducts.includes(product.id) : false,
      isOwned: userId ? userOwnedProducts.includes(product.id) : false,
    }));

    return formattedProducts;

  } catch (error) {
    console.error('商品検索エラー:', error);
    throw new Error('商品の取得に失敗しました');
  }
}
