'use server';

import { prisma } from '@/lib/prisma';
import { revalidateAvatarDefinitions } from '@/lib/avatars';
import { TagResolver } from '@/lib/booth-scraper/tag-resolver';

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
}) {
  try {
    const item = await prisma.avatarItem.create({
      data: {
        itemId: data.itemId,
        avatarName: data.avatarName,
        itemUrl: data.itemUrl,
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
  data: { itemId: string; avatarName: string; itemUrl?: string }
) {
  try {
    const item = await prisma.avatarItem.update({
      where: { id },
      data: {
        itemId: data.itemId,
        avatarName: data.avatarName,
        itemUrl: data.itemUrl,
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
    // アバター定義を取得
    const avatarItem = await prisma.avatarItem.findUnique({
      where: { id: avatarId },
    });

    if (!avatarItem) {
      return { success: false, error: 'Avatar item not found' };
    }

    const { itemId, avatarName } = avatarItem;
    // 自動付与は「アバター名」単体とする
    const tagName = avatarName;

    // 説明文にIDが含まれる商品を検索
    const products = await prisma.product.findMany({
      where: {
        description: {
          contains: itemId,
        },
      },
      include: {
        productTags: {
          include: {
            tag: true,
          },
        },
      },
    });

    const { auth } = require("@/auth"); // Dynamic import for server action
    const session = await auth();
    const sessionUserId = session?.user?.id;

    // シードの管理者ユーザーを取得
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@example.com' },
      select: { id: true }
    });

    // タグ付けに使用するユーザーID: シード管理者を優先、なければ実行ユーザー
    const taggerUserId = adminUser?.id || sessionUserId;

    if (!taggerUserId) {
        return { success: false, error: 'Unauthorized: Admin user or Session ID not found' };
    }

    let updatedCount = 0;
    const tagResolver = new TagResolver();

    for (const product of products) {
      // 既に「独自タグ（isOfficial: false）」として該当タグが付いているか確認
      const hasUnofficialTag = product.productTags.some(
        (pt) => (pt.tag.name === tagName.toLowerCase() || pt.tag.name === tagName) && pt.isOfficial === false
      );

      if (!hasUnofficialTag) {
        // タグを解決（存在しなければ作成）
        // resolveTagIdが存在しないためresolveTagsを使用
        const tagIds = await tagResolver.resolveTags([tagName]);
        const tagId = tagIds[0];

        if (!tagId) {
             console.warn(`Failed to resolve tag ID for ${tagName}`);
             continue;
        }

        // ProductTagを作成
        try {
          await prisma.productTag.create({
            data: {
              productId: product.id,
              tagId: tagId,
              userId: taggerUserId, // 管理者ユーザーIDを使用
              isOfficial: false, // PolySeek独自タグとして登録
            },
          });
          updatedCount++;
        } catch (e) {
            // ユニーク制約等で失敗した場合はスキップ（念のため）
            console.warn(`Failed to add unofficial tag to product ${product.id}:`, e);
        }

        // 変更履歴を追加（オプション）
        // NOTE: 大量更新時のパフォーマンスを考慮し、今回は履歴作成を省略するか、必要なら追加する
        // ここでは簡易実装として履歴作成はスキップし、タグ付与のみを行う
      }
    }

    return { success: true, count: updatedCount };
  } catch (error) {
    console.error('Failed to rescan products:', error);
    return { success: false, error: 'Failed to rescan products' };
  }
}
