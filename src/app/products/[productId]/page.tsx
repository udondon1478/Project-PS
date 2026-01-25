import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import ProductDetailClient from './ProductDetailClient';

export default async function ProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      seller: true,
      images: {
        orderBy: { order: 'asc' },
      },
      productTags: {
        select: {
          isOfficial: true,
          tag: {
            select: {
              id: true,
              name: true,
              displayName: true,
              description: true,
              tagCategoryId: true,
              tagCategory: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
      },
      likes: {
        where: { userId: userId ?? '' },
      },
      productOwners: {
        where: { userId: userId ?? '' },
      },
      tagEditHistory: {
        include: {
          editor: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: { version: 'desc' },
      },
    },
  });

  if (!product) {
    notFound();
  }

  // Fetch user's votes for the history items
  let userVotesMap: { [key: string]: { score: number } } = {};
  if (userId && product.tagEditHistory.length > 0) {
    const historyIds = product.tagEditHistory.map(h => h.id);
    const votes = await prisma.tagEditVote.findMany({
      where: {
        userId: userId,
        historyId: { in: historyIds },
      },
      select: {
        historyId: true,
        score: true,
      },
    });
    votes.forEach(vote => {
      userVotesMap[vote.historyId] = { score: vote.score };
    });
  }

  // Augment history with user's vote
  const tagEditHistoryWithVotes = product.tagEditHistory.map(history => ({
    ...history,
    createdAt: history.createdAt.toISOString(),
    userVote: userVotesMap[history.id] || null,
  }));

  // Build tag ID to name map for history display
  const tagIdToNameMap: { [key: string]: { name: string; displayName: string | null } } = {};
  if (product.tagEditHistory.length > 0) {
    const tagIds = new Set<string>();
    product.tagEditHistory.forEach(history => {
      history.addedTags.forEach(id => tagIds.add(id));
      history.removedTags.forEach(id => tagIds.add(id));
      history.keptTags.forEach(id => tagIds.add(id));
    });

    if (tagIds.size > 0) {
      const tags = await prisma.tag.findMany({
        where: { id: { in: Array.from(tagIds) } },
        select: { id: true, name: true, displayName: true },
      });

      tags.forEach(tag => {
        tagIdToNameMap[tag.id] = { name: tag.name, displayName: tag.displayName };
      });
    }
  }

  // Prepare product data for client component
  const productData = {
    id: product.id,
    boothJpUrl: product.boothJpUrl,
    boothEnUrl: product.boothEnUrl || '',
    title: product.title,
    description: product.description,
    seller: product.seller ? {
      name: product.seller.name,
      iconUrl: product.seller.iconUrl,
      sellerUrl: product.seller.sellerUrl,
    } : null,
    isLiked: product.likes.length > 0,
    isOwned: product.productOwners.length > 0,
    images: product.images.map(img => ({
      imageUrl: img.imageUrl,
      caption: img.caption,
      order: img.order,
      isMain: img.isMain,
    })),
    productTags: product.productTags.map(pt => ({
      isOfficial: pt.isOfficial,
      tag: {
        id: pt.tag.id,
        name: pt.tag.name,
        displayName: pt.tag.displayName,
        description: pt.tag.description,
        tagCategoryId: pt.tag.tagCategoryId,
        tagCategory: pt.tag.tagCategory ? {
          id: pt.tag.tagCategory.id,
          name: pt.tag.tagCategory.name,
          color: pt.tag.tagCategory.color,
        } : {
          id: '',
          name: '',
          color: undefined,
        },
      },
    })),
    tagEditHistory: tagEditHistoryWithVotes,
  };

  return (
    <ProductDetailClient
      initialProduct={productData}
      initialTagMap={tagIdToNameMap}
    />
  );
}
