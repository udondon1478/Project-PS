import React from "react";
import ProductGrid from "@/components/ProductGrid";
import { Product } from "@/types/product";
import { Metadata } from 'next';
import { prisma } from '@/lib/prisma'; // Prismaクライアントをインポート
import { auth } from '@/auth'; // authヘルパーをインポート
import { Prisma } from '@prisma/client'; // Prismaの型をインポート

interface SearchPageProps {
  searchParams?: Promise<{
    tags?: string;
    ageRatingTags?: string;
    categoryTagId?: string;
    featureTagIds?: string;
    negativeTags?: string;
    minPrice?: string;
    maxPrice?: string;
    liked?: string;
    owned?: string;
    isHighPrice?: string;
  }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const searchTerm = resolvedSearchParams?.tags || "";
  const negativeSearchTerm = resolvedSearchParams?.negativeTags || "";
  let title = "検索結果";

  if (searchTerm && negativeSearchTerm) {
    title = `検索: ${searchTerm} -${negativeSearchTerm}`;
  } else if (searchTerm) {
    title = `検索: ${searchTerm}`;
  } else if (negativeSearchTerm) {
    title = `検索: -${negativeSearchTerm}`;
  }

  return {
    title: title,
  };
}

const SearchPage = async ({ searchParams }: SearchPageProps) => {
  const resolvedSearchParams = await searchParams;

  let products: Product[] = [];
  let error: string | null = null;

  try {
    // --- START: APIロジックをここに移動 ---
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

    const tagsParam = resolvedSearchParams?.tags;
    const negativeTagsParam = resolvedSearchParams?.negativeTags;
    const ageRatingTagsParam = resolvedSearchParams?.ageRatingTags;
    const categoryTagId = resolvedSearchParams?.categoryTagId;
    const featureTagIdsParam = resolvedSearchParams?.featureTagIds;
    const minPriceParam = resolvedSearchParams?.minPrice;
    const maxPriceParam = resolvedSearchParams?.maxPrice;
    const isHighPriceParam = resolvedSearchParams?.isHighPrice;

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

    const likedParam = resolvedSearchParams?.liked;
    const ownedParam = resolvedSearchParams?.owned;

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

    const dbProducts = await prisma.product.findMany({
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

    products = dbProducts.map(product => ({
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
    // --- END: APIロジック ---

  } catch (err: unknown) {
    if (err instanceof Error) {
      error = err.message;
    } else {
      error = 'An unknown error occurred';
    }
  }

  const searchTerm = resolvedSearchParams?.tags || "";
  const ageRatingTags = resolvedSearchParams?.ageRatingTags?.split(',') || [];
  const categoryTagId = resolvedSearchParams?.categoryTagId || "";
  const featureTagIds = resolvedSearchParams?.featureTagIds?.split(',') || [];

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (products.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 pt-40">
        <p>検索キーワード: {searchTerm}</p>
        {ageRatingTags.length > 0 && <p>対象年齢タグ: {ageRatingTags.join(',')}</p>}
        {categoryTagId && <p>カテゴリータグID: {categoryTagId}</p>}
        {featureTagIds.length > 0 && <p>主要機能タグID: {featureTagIds.join(',')}</p>}
        <div>指定された条件に一致する商品は見つかりませんでした。</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-40">
      <p>検索キーワード: {searchTerm}</p>
      {ageRatingTags.length > 0 && <p>対象年齢タグ: {ageRatingTags.join(',')}</p>}
      {categoryTagId && <p>カテゴリータグID: {categoryTagId}</p>}
      {featureTagIds.length > 0 && <p>主要機能タグID: {featureTagIds.join(',')}</p>}

      <ProductGrid products={products} showLikeButton={true} showOwnButton={true} />
    </div>
  );
};

export default SearchPage;