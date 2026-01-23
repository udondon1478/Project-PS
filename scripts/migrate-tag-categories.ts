/**
 * タグカテゴリマイグレーションスクリプト
 * 旧カテゴリから新カテゴリ（10カテゴリ）への移行を実行
 *
 * 使用方法:
 *   # プレビュー（dry-run）
 *   npx tsx scripts/migrate-tag-categories.ts --dry-run
 *
 *   # 本番実行
 *   npx tsx scripts/migrate-tag-categories.ts --execute
 *
 *   # バックアップなしで強制実行（非推奨）
 *   npx tsx scripts/migrate-tag-categories.ts --execute --skip-backup-check
 *
 * 注意事項:
 *   - 本番実行前に必ず --dry-run でプレビューを確認してください
 *   - 本番DBでの実行前に必ずバックアップを取得してください
 */

import { PrismaClient } from '@prisma/client';
import { tagCategories } from '../src/data/guidelines/tagCategories';
import { determineCategory } from '../src/data/guidelines/tagMappingRules';

const prisma = new PrismaClient();

interface MigrationStats {
  categoriesCreated: number;
  categoriesUpdated: number;
  tagsUpdated: number;
  tagsByCategory: Record<string, number>;
  errors: string[];
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const execute = args.includes('--execute');
  const skipBackupCheck = args.includes('--skip-backup-check');

  if (!dryRun && !execute) {
    console.log('エラー: --dry-run または --execute オプションを指定してください。');
    console.log('');
    console.log('使用方法:');
    console.log('  npx tsx scripts/migrate-tag-categories.ts --dry-run    # プレビュー');
    console.log('  npx tsx scripts/migrate-tag-categories.ts --execute    # 本番実行');
    process.exit(1);
  }

  console.log('=== タグカテゴリマイグレーション ===\n');
  console.log(`モード: ${dryRun ? 'DRY-RUN（プレビュー）' : '本番実行'}\n`);

  if (execute && !skipBackupCheck) {
    console.log('⚠️  本番実行モードです。');
    console.log('   本番DBのバックアップは取得済みですか？');
    console.log('   続行する場合は5秒お待ちください...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  const stats: MigrationStats = {
    categoriesCreated: 0,
    categoriesUpdated: 0,
    tagsUpdated: 0,
    tagsByCategory: {},
    errors: [],
  };

  // Step 1: 新カテゴリをDBに登録（nameでupsert）
  console.log('## Step 1: カテゴリの登録/更新\n');

  // 既存のカテゴリを取得してマップ化
  const existingCategories = await prisma.tagCategory.findMany();
  const existingByName = new Map(existingCategories.map(c => [c.name, c]));
  const existingById = new Map(existingCategories.map(c => [c.id, c]));

  console.log(`  既存カテゴリ数: ${existingCategories.length}`);
  for (const cat of existingCategories) {
    console.log(`    - ${cat.name} (id: ${cat.id})`);
  }
  console.log('');

  // 新カテゴリIDと既存カテゴリIDのマッピングを作成
  const categoryIdMapping: Record<string, string> = {};

  for (const cat of tagCategories) {
    try {
      const existingByNameMatch = existingByName.get(cat.name);
      const existingByIdMatch = existingById.get(cat.id);

      if (dryRun) {
        if (existingByNameMatch) {
          console.log(`  [更新] ${cat.name}: 色を ${existingByNameMatch.color} → ${cat.color}`);
          categoryIdMapping[cat.id] = existingByNameMatch.id;
          stats.categoriesUpdated++;
        } else if (existingByIdMatch) {
          console.log(`  [更新] ${cat.id}: 名前を ${existingByIdMatch.name} → ${cat.name}`);
          categoryIdMapping[cat.id] = existingByIdMatch.id;
          stats.categoriesUpdated++;
        } else {
          console.log(`  [新規] ${cat.id}: ${cat.name} (${cat.color})`);
          categoryIdMapping[cat.id] = cat.id;
          stats.categoriesCreated++;
        }
      } else {
        if (existingByNameMatch) {
          // 名前で見つかった場合は色を更新
          await prisma.tagCategory.update({
            where: { id: existingByNameMatch.id },
            data: { color: cat.color },
          });
          categoryIdMapping[cat.id] = existingByNameMatch.id;
          console.log(`  ✓ 更新: ${cat.name} (既存ID: ${existingByNameMatch.id})`);
          stats.categoriesUpdated++;
        } else {
          // 新規作成
          const created = await prisma.tagCategory.create({
            data: {
              id: cat.id,
              name: cat.name,
              color: cat.color,
            },
          });
          categoryIdMapping[cat.id] = created.id;
          console.log(`  ✓ 作成: ${cat.name} (ID: ${created.id})`);
          stats.categoriesCreated++;
        }
      }
    } catch (error) {
      const message = `カテゴリ ${cat.id} の処理でエラー: ${error}`;
      console.error(`  ✗ ${message}`);
      stats.errors.push(message);
    }
  }

  console.log('');
  console.log('  カテゴリIDマッピング:');
  for (const [newId, actualId] of Object.entries(categoryIdMapping)) {
    console.log(`    ${newId} → ${actualId}`);
  }
  console.log('');

  // Step 2: 既存タグのカテゴリを更新
  console.log('## Step 2: タグのカテゴリ更新\n');

  // すべてのタグを取得
  const allTags = await prisma.tag.findMany({
    include: { tagCategory: true },
  });

  console.log(`  対象タグ数: ${allTags.length}\n`);

  // カテゴリ別にグループ化して更新
  const tagUpdates: { tagId: string; newCategoryId: string; tagName: string }[] = [];

  for (const tag of allTags) {
    const suggestedCategoryKey = determineCategory(tag.name, tag.displayName || undefined);
    const newCategoryId = categoryIdMapping[suggestedCategoryKey] || suggestedCategoryKey;
    const currentCategoryId = tag.tagCategoryId;

    // カテゴリが変更される場合のみ記録
    if (currentCategoryId !== newCategoryId) {
      tagUpdates.push({
        tagId: tag.id,
        newCategoryId,
        tagName: tag.name,
      });
    }

    // 統計を記録
    stats.tagsByCategory[suggestedCategoryKey] = (stats.tagsByCategory[suggestedCategoryKey] || 0) + 1;
  }

  console.log(`  更新が必要なタグ数: ${tagUpdates.length}\n`);

  // バッチ更新
  if (tagUpdates.length > 0) {
    if (dryRun) {
      console.log('  [プレビュー] 以下のタグが更新されます:\n');

      // カテゴリ別に集計して表示
      const updatesByCategory: Record<string, number> = {};
      for (const update of tagUpdates) {
        const catKey = Object.entries(categoryIdMapping).find(([, v]) => v === update.newCategoryId)?.[0] || update.newCategoryId;
        updatesByCategory[catKey] = (updatesByCategory[catKey] || 0) + 1;
      }

      for (const [catId, count] of Object.entries(updatesByCategory).sort((a, b) => b[1] - a[1])) {
        const catName = tagCategories.find(c => c.id === catId)?.name || catId;
        console.log(`    → ${catName} (${catId}): ${count}個`);
      }

      stats.tagsUpdated = tagUpdates.length;
    } else {
      // トランザクションで一括更新
      console.log('  タグを更新中...\n');

      const BATCH_SIZE = 100;
      let processed = 0;

      for (let i = 0; i < tagUpdates.length; i += BATCH_SIZE) {
        const batch = tagUpdates.slice(i, i + BATCH_SIZE);

        try {
          await prisma.$transaction(
            batch.map(update =>
              prisma.tag.update({
                where: { id: update.tagId },
                data: { tagCategoryId: update.newCategoryId },
              })
            )
          );

          processed += batch.length;
          console.log(`    ✓ ${processed}/${tagUpdates.length} 件処理完了`);
        } catch (error) {
          const message = `バッチ ${i}-${i + BATCH_SIZE} の更新でエラー: ${error}`;
          console.error(`    ✗ ${message}`);
          stats.errors.push(message);
        }
      }

      stats.tagsUpdated = processed;
    }
  }

  console.log('');

  // Step 3: 結果レポート
  console.log('## マイグレーション結果レポート\n');

  console.log('### カテゴリ操作');
  console.log(`  - 新規作成: ${stats.categoriesCreated}件`);
  console.log(`  - 更新: ${stats.categoriesUpdated}件`);
  console.log('');

  console.log('### タグ操作');
  console.log(`  - 更新: ${stats.tagsUpdated}件`);
  console.log('');

  console.log('### カテゴリ別タグ分布');
  for (const cat of tagCategories) {
    const count = stats.tagsByCategory[cat.id] || 0;
    console.log(`  - ${cat.name} (${cat.id}): ${count}件`);
  }
  console.log('');

  if (stats.errors.length > 0) {
    console.log('### エラー');
    for (const error of stats.errors) {
      console.log(`  - ${error}`);
    }
    console.log('');
  }

  // 完了メッセージ
  if (dryRun) {
    console.log('---');
    console.log('これはプレビューです。実際のDBへの変更は行われていません。');
    console.log('本番実行する場合は --execute オプションを使用してください。');
    console.log('');
    console.log('  npx tsx scripts/migrate-tag-categories.ts --execute');
  } else {
    console.log('---');
    console.log('マイグレーションが完了しました。');

    if (stats.errors.length > 0) {
      console.log(`⚠️ ${stats.errors.length}件のエラーが発生しました。上記のエラーログを確認してください。`);
    } else {
      console.log('✓ すべての処理が正常に完了しました。');
    }
  }
}

main()
  .catch(error => {
    console.error('マイグレーション中に致命的なエラーが発生しました:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
