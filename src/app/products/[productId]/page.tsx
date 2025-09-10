import React from 'react';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { notFound } from 'next/navigation';
// The import path is now relative
import ProductDetailClientPage from '../../../components/products/ProductDetailClientPage';

interface ProductPageProps {
  params: {
    productId: string;
  };
}

const ProductPage = async ({ params }: ProductPageProps) => {
  const { productId } = params;
  const session = await auth();
  const userId = session?.user?.id;

  const productData = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      seller: true,
      images: { orderBy: { order: 'asc' } },
      productTags: {
        include: {
          tag: {
            include: {
              tagCategory: true,
            },
          },
        },
        orderBy: {
          tag: {
            name: 'asc'
          }
        }
      },
      tagEditHistory: {
        include: {
          editor: {
            select: { id: true, name: true, image: true }
          },
          voters: {
            where: { userId: userId || '' },
            select: { score: true }
          }
        },
        orderBy: {
          version: 'desc'
        }
      }
    },
  });

  if (!productData) {
    notFound();
  }
  
  const userLike = userId ? await prisma.productLike.findUnique({
    where: { productId_userId: { productId, userId } },
  }) : null;

  const userOwnership = userId ? await prisma.productOwner.findUnique({
    where: { userId_productId: { productId, userId } },
  }) : null;

  const allTagIds = productData.tagEditHistory.flatMap(h => [...h.addedTags, ...h.removedTags, ...h.keptTags]);
  const uniqueTagIds = [...new Set(allTagIds)];
  const tagsData = await prisma.tag.findMany({
    where: { id: { in: uniqueTagIds } },
    select: { id: true, name: true }
  });
  const tagIdToNameMap = Object.fromEntries(tagsData.map(t => [t.id, t.name]));

  const initialProduct = {
    ...productData,
    isLiked: !!userLike,
    isOwned: !!userOwnership,
    tagEditHistory: productData.tagEditHistory.map(h => ({
        ...h,
        createdAt: h.createdAt.toISOString(),
        userVote: h.voters.length > 0 ? { score: h.voters[0].score } : null,
    }))
  };

  return <ProductDetailClientPage initialProduct={initialProduct} initialTagMap={tagIdToNameMap} />;
};

export default ProductPage;