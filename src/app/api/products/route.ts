import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib_prisma/prisma';
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

    const filterParam = searchParams.get('filter');

    const tagNames = tagsParam ? tagsParam.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];
    const negativeTagNames = negativeTagsParam ? negativeTagsParam.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];
    const featureTagIds = featureTagIdsParam ? featureTagIdsParam.split(',').map(id => id.trim()).filter(id => id.length > 0) : [];

    const andConditions: Prisma.ProductWhereInput[] = [];

    if (filterParam === 'liked' && userId) {
      andConditions.push({ id: { in: userLikedProducts } });
    } else if (filterParam === 'owned' && userId) {
      andConditions.push({ id: { in: userOwnedProducts } });
    }

    let ageRatingTagIds: string[] = [];
    if (ageRatingTagsParam) {
      const ageRatingTags = ageRatingTagsParam.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      if (ageRatingTags.length > 0) {
        const tags = await prisma.tag.findMany({
          where: { name: { in: ageRatingTags }, tagCategory: { name: "age_rating" } },
          select: { id: true },
        });
        ageRatingTagIds = tags.map(tag => tag.id);
      }
    }

    if (ageRatingTagIds.length > 0) {
      andConditions.push({ productTags: { some: { tagId: { in: ageRatingTagIds } } } });
    } else {
      const allAgeTag = await prisma.tag.findFirst({
        where: { name: "全年齢", tagCategory: { name: "age_rating" } },
        select: { id: true },
      });
      if (allAgeTag) {
        andConditions.push({ productTags: { some: { tagId: allAgeTag.id } } });
      }
    }

    if (tagNames.length > 0) {
      andConditions.push(...tagNames.map(tagName => ({
        productTags: { some: { tag: { name: tagName } } }
      })));
    }

    if (negativeTagNames.length > 0) {
      andConditions.push(...negativeTagNames.map(negativeTagName => ({
        productTags: { none: { tag: { name: negativeTagName } } }
      })));
    }

    const tagIdsToFilter = [...featureTagIds];
    if (categoryTagId) {
      tagIdsToFilter.push(categoryTagId);
    }
    if (tagIdsToFilter.length > 0) {
      andConditions.push(...tagIdsToFilter.map(tagId => ({
        productTags: { some: { tagId: tagId } }
      })));
    }

    const priceCondition: Prisma.ProductWhereInput = {};
    if (minPrice !== undefined) {
      priceCondition.highPrice = { gte: minPrice };
    }
    if (maxPrice !== undefined && maxPrice !== 100000) {
      priceCondition.lowPrice = { lte: maxPrice };
    }
    if (Object.keys(priceCondition).length > 0) {
      andConditions.push(priceCondition);
    }

    const where: Prisma.ProductWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        productTags: { include: { tag: true } },
        images: { where: { isMain: true }, take: 1 },
        variations: { orderBy: { order: 'asc' } },
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
