import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);

    const tagsParam = searchParams.get('tags');
    const negativeTagsParam = searchParams.get('negativeTags');
    const ageRatingTagsParam = searchParams.get('ageRatingTags');
    const categoryTagId = searchParams.get('categoryTagId');
    const featureTagIdsParam = searchParams.get('featureTagIds');
    const minPriceParam = searchParams.get('minPrice');
    const maxPriceParam = searchParams.get('maxPrice');
    const isHighPriceParam = searchParams.get('isHighPrice');

    let minPrice = minPriceParam ? parseInt(minPriceParam) : undefined;
    let maxPrice = maxPriceParam ? parseInt(maxPriceParam) : undefined;

    if (isHighPriceParam === 'true') {
      minPrice = 10000;
      maxPrice = 100000;
    }

    const tagNames = tagsParam ? tagsParam.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];
    const negativeTagNames = negativeTagsParam ? negativeTagsParam.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];
    const featureTagIds = featureTagIdsParam ? featureTagIdsParam.split(',').map(id => id.trim()).filter(id => id.length > 0) : [];

    const whereConditions: Prisma.ProductWhereInput[] = [];

    let ageRatingTagIds: string[] = [];
    if (ageRatingTagsParam) {
      const ageRatingTags = ageRatingTagsParam.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
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

    const tagIdsToFilter = [...featureTagIds];
    if (categoryTagId) {
      tagIdsToFilter.push(categoryTagId);
    }

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

    const likedParam = searchParams.get('liked');
    const ownedParam = searchParams.get('owned');

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

    const formattedProducts = products.map(product => ({
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

    return NextResponse.json(formattedProducts);

  } catch (error) {
    console.error('商品検索APIエラー:', error);
    return NextResponse.json({ error: '商品の取得に失敗しました' }, { status: 500 });
  }
}
