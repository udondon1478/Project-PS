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

  for (const category of tagCategories) {
    await prisma.tagCategory.upsert({
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
    });
    console.log(`  Synced category: ${category.name} (${category.id})`);
  }

  console.log(`Tag categories synced: ${tagCategories.length} categories`);
}
