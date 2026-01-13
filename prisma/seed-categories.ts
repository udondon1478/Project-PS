import { PrismaClient } from '@prisma/client';
import { tagCategories } from '../src/data/guidelines/tagCategories';

/**
 * TagCategoryテーブルをtagCategories.tsの定義と同期させる
 * - 存在しないカテゴリは作成
 * - 既存カテゴリは更新（name, color）
 * - 不要なカテゴリは削除しない（既存タグとの関連を保持）
 */
export async function seedTagCategories(prisma: PrismaClient) {
  console.log('Syncing tag categories from tagCategories.ts...');

  const promises = tagCategories.map((category) =>
    prisma.tagCategory
      .upsert({
        where: { id: category.id },
        update: {
          name: category.name,
          color: category.color,
        },
        create: {
          id: category.id,
          name: category.name,
          color: category.color,
        },
      })
      .then(() => ({ category, success: true as const }))
      .catch((error) => ({ category, success: false as const, error }))
  );

  const results = await Promise.allSettled(promises);

  let successCount = 0;
  let failureCount = 0;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const value = result.value;
      if (value.success) {
        console.log(`  ✓ Synced category: ${value.category.name} (${value.category.id})`);
        successCount++;
      } else {
        console.error(
          `  ✗ Failed to sync category: ${value.category.name} (${value.category.id})`,
          value.error
        );
        failureCount++;
      }
    } else {
      console.error(`  ✗ Unexpected rejection:`, result.reason);
      failureCount++;
    }
  }

  console.log(
    `Tag categories synced: ${successCount}/${tagCategories.length} succeeded, ${failureCount} failed`
  );
}
