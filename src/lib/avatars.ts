import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { revalidateTag } from 'next/cache';

/**
 * アバター定義のキャッシュタグ
 */
const AVATAR_DEFINITIONS_TAG = 'avatar-definitions';

/**
 * 全アバター定義を取得します。
 * itemId (BOOTH商品ID) をキー、avatarName (アバター名) を値とするMap形式のオブジェクトを返します。
 * パフォーマンスのため、結果はキャッシュされます。
 */
export const getAvatarDefinitions = unstable_cache(
  async () => {
    const avatars = await prisma.avatarItem.findMany({
      select: {
        itemId: true,
        avatarName: true,
      },
    });

    const definitions: Record<string, string> = {};
    for (const avatar of avatars) {
      definitions[avatar.itemId] = avatar.avatarName;
    }

    return definitions;
  },
  [AVATAR_DEFINITIONS_TAG],
  {
    tags: [AVATAR_DEFINITIONS_TAG],
    revalidate: 3600, // 1時間で再検証（ただしrevalidateTagで即時無効化も行う）
  }
);

/**
 * アバター定義のキャッシュを無効化します。
 * 定義の追加・更新・削除時に呼び出してください。
 */
export const revalidateAvatarDefinitions = () => {
  // @ts-expect-error Next.js type definition expects 2 arguments but runtime only needs 1
  revalidateTag(AVATAR_DEFINITIONS_TAG);
};
