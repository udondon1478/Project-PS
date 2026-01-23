import { PrismaClient } from '@prisma/client';
import { tagCategories } from '../src/data/guidelines/tagCategories';

/**
 * TagCategoryテーブルをtagCategories.tsの定義と同期させる
 * - 存在しないカテゴリは作成
 * - 既存カテゴリは更新（color）
 * - 不要なカテゴリは削除しない（既存タグとの関連を保持）
 *
 * nameをキーとしてupsertし、新規作成時はcategory.idを使用
 */
export async function seedTagCategories(prisma: PrismaClient) {
  console.log('Syncing tag categories from tagCategories.ts...');

  // nameはuniqueなので、nameで検索してupsert
  const promises = tagCategories.map((category) =>
    prisma.tagCategory.upsert({
      where: { name: category.name },
      update: {
        color: category.color,
      },
      create: {
        id: category.id,
        name: category.name,
        color: category.color,
      },
    })
  );

  const results = await Promise.allSettled(promises);

  let successCount = 0;
  let failureCount = 0;

  results.forEach((result, index) => {
    const category = tagCategories[index];
    if (result.status === 'fulfilled') {
      console.log(`  ✓ Synced category: ${category.name} (${category.id})`);
      successCount++;
    } else {
      console.error(
        `  ✗ Failed to sync category: ${category.name} (${category.id})`,
        result.reason
      );
      failureCount++;
    }
  });

  console.log(
    `Tag categories synced: ${successCount}/${tagCategories.length} succeeded, ${failureCount} failed`
  );
}
