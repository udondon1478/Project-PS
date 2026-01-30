'use server';

import { prisma } from '@/lib/prisma';
import { revalidateAvatarDefinitions, getAvatarDefinitions } from '@/lib/avatars';
import { TagResolver } from '@/lib/booth-scraper/tag-resolver';
import { isAdmin } from '@/lib/auth';

/**
 * アバター定義マップを取得します（クライアントサイド検知用）
 */
export async function getAvatarDefinitionsMap() {
  try {
    const definitions = await getAvatarDefinitions();
    return { success: true, data: definitions };
  } catch (error) {
    console.error('Failed to fetch avatar definitions map:', error);
    return { success: false, error: 'Failed to fetch avatar definitions map' };
  }
}

/**
 * アバター定義一覧を取得します
 */
export async function getAvatarItems() {
  try {
    const items = await prisma.avatarItem.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: items };
  } catch (error) {
    console.error('Failed to fetch avatar items:', error);
    return { success: false, error: 'Failed to fetch avatar items' };
  }
}

/**
 * アバター定義を作成します
 */
export async function createAvatarItem(data: {
  itemId: string;
  avatarName: string;
  itemUrl?: string;
  aliases?: string[];
  suggestedTags?: string[];
}) {
  try {
    if (!(await isAdmin())) {
      return { success: false, error: 'Unauthorized' };
    }
    const item = await prisma.avatarItem.create({
      data: {
        itemId: data.itemId,
        avatarName: data.avatarName,
        itemUrl: data.itemUrl,
        aliases: data.aliases || [],
        suggestedTags: data.suggestedTags || [],
      },
    });
    revalidateAvatarDefinitions();
    return { success: true, data: item };
  } catch (error) {
    console.error('Failed to create avatar item:', error);
    return { success: false, error: 'Failed to create avatar item' };
  }
}

/**
 * アバター定義を更新します
 */
export async function updateAvatarItem(
  id: string,
  data: {
    itemId: string;
    avatarName: string;
    itemUrl?: string;
    aliases?: string[];
    suggestedTags?: string[];
  }
) {
  try {
    if (!(await isAdmin())) {
      return { success: false, error: 'Unauthorized' };
    }
    const item = await prisma.avatarItem.update({
      where: { id },
      data: {
        itemId: data.itemId,
        avatarName: data.avatarName,
        itemUrl: data.itemUrl,
        aliases: data.aliases || [],
        suggestedTags: data.suggestedTags || [],
      },
    });
    revalidateAvatarDefinitions();
    return { success: true, data: item };
  } catch (error) {
    console.error('Failed to update avatar item:', error);
    return { success: false, error: 'Failed to update avatar item' };
  }
}

/**
 * アバター定義を削除します
 */
export async function deleteAvatarItem(id: string) {
  try {
    if (!(await isAdmin())) {
      return { success: false, error: 'Unauthorized' };
    }
    await prisma.avatarItem.delete({
      where: { id },
    });
    revalidateAvatarDefinitions();
    return { success: true };
  } catch (error) {
    console.error('Failed to delete avatar item:', error);
    return { success: false, error: 'Failed to delete avatar item' };
  }
}

/**
 * 指定されたアバター定義に基づいて、既存の商品を再スキャンしタグを付与します
 */
export async function rescanProductsForAvatar(avatarId: string) {
  try {
    const { auth } = await import("@/auth"); // Dynamic import for server action
    const session = await auth();

    // 管理者権限チェックを最優先で行う
    if (!(await isAdmin())) {
      return { success: false, error: 'Unauthorized: Admin privileges required' };
    }

    const sessionUserId = session?.user?.id;
    // タグ付けに使用するユーザーID: 実行ユーザー（管理者）
    const taggerUserId = sessionUserId;

    if (!taggerUserId) {
        return { success: false, error: 'Unauthorized: Session ID not found' };
    }

    // アバター定義を取得
    const avatarItem = await prisma.avatarItem.findUnique({
      where: { id: avatarId },
    });

    if (!avatarItem) {
      return { success: false, error: 'Avatar item not found' };
    }

    const { itemId, avatarName, aliases, suggestedTags } = avatarItem;

    // 付与対象のタグ名: suggestedTags が空の場合はアバター名をデフォルトとする（後方互換性のため）
    const targetTagNames: string[] = (suggestedTags && suggestedTags.length > 0)
      ? suggestedTags
      : [avatarName];

    // ID、アバター名、エイリアスのいずれかが説明文に含まれる商品を検索
    const searchTerms = [itemId, avatarName, ...aliases].filter(Boolean);

    const products = await prisma.product.findMany({
      where: {
        OR: searchTerms.map(term => ({
          description: {
            contains: term,
            mode: 'insensitive',
          },
        })),
      },
      include: {
        productTags: {
          include: {
            tag: true,
          },
        },
      },
    });

    let updatedCount = 0;
    const tagResolver = new TagResolver();

    // N+1解消: ループ外でタグIDを解決
    const tagIds = await tagResolver.resolveTags(targetTagNames);

    if (tagIds.length === 0) {
         console.warn(`Failed to resolve tag IDs for ${targetTagNames.join(', ')}`);
         return { success: false, error: 'Failed to resolve tag IDs' };
    }

    const tagsToCreate = [];

    for (const product of products) {
      for (const tagId of tagIds) {
          // 既に「独自タグ（isOfficial: false）」として該当タグが付いているか確認
          const hasUnofficialTag = product.productTags.some(
            (pt) => pt.tagId === tagId && pt.isOfficial === false
          );

          if (!hasUnofficialTag) {
            tagsToCreate.push({
              productId: product.id,
              tagId: tagId,
              userId: taggerUserId, // 管理者ユーザーIDを使用
              isOfficial: false, // PolySeek独自タグとして登録
            });
          }
      }
    }

    if (tagsToCreate.length > 0) {
      const result = await prisma.productTag.createMany({
        data: tagsToCreate,
        skipDuplicates: true,
      });
      updatedCount = result.count;
    }

    return { success: true, count: updatedCount };
  } catch (error) {
    console.error('Failed to rescan products:', error);
    return { success: false, error: 'Failed to rescan products' };
  }
}
