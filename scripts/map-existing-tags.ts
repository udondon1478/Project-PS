/**
 * タグマッピングプレビュースクリプト
 * 既存タグを新カテゴリに自動分類した結果をプレビュー表示（dry-run）
 *
 * 使用方法:
 *   npx ts-node scripts/map-existing-tags.ts
 *   npx ts-node scripts/map-existing-tags.ts --verbose
 *   npx ts-node scripts/map-existing-tags.ts --category=platform
 */

import { PrismaClient } from '@prisma/client';
import {
  determineCategory,
  categoryMappingRules,
} from '../src/data/guidelines/tagMappingRules';
import { tagCategories } from '../src/data/guidelines/tagCategories';

const prisma = new PrismaClient();

interface MappingResult {
  tagId: string;
  tagName: string;
  displayName: string | null;
  count: number;
  currentCategory: string | null;
  currentCategoryId: string | null;
  newCategory: string;
  changed: boolean;
}

async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  const filterCategory = args.find(a => a.startsWith('--category='))?.split('=')[1];

  console.log('=== タグマッピングプレビュー ===\n');
  console.log('※ このスクリプトはDRY-RUNです。DBへの変更は行いません。\n');

  // 新カテゴリ一覧を表示
  console.log('## 新カテゴリ一覧');
  for (const cat of tagCategories) {
    console.log(`  ${cat.priority}. ${cat.id}: ${cat.name} (${cat.nameEn})`);
  }
  console.log('');

  // 既存タグを取得
  const tags = await prisma.tag.findMany({
    include: { tagCategory: true },
    orderBy: { count: 'desc' },
  });

  console.log(`## 対象タグ数: ${tags.length}\n`);

  // マッピング結果を計算
  const results: MappingResult[] = tags.map(tag => {
    const newCategory = determineCategory(tag.name, tag.displayName || undefined);
    const currentCategoryId = tag.tagCategoryId;
    const currentCategoryName = tag.tagCategory?.name || null;

    return {
      tagId: tag.id,
      tagName: tag.name,
      displayName: tag.displayName,
      count: tag.count,
      currentCategory: currentCategoryName,
      currentCategoryId: currentCategoryId,
      newCategory,
      changed: currentCategoryId !== newCategory,
    };
  });

  // カテゴリ別に集計
  const stats: Record<string, { total: number; changed: number; tags: MappingResult[] }> = {};
  for (const cat of tagCategories) {
    stats[cat.id] = { total: 0, changed: 0, tags: [] };
  }
  stats['(未分類)'] = { total: 0, changed: 0, tags: [] };

  for (const result of results) {
    const catStats = stats[result.newCategory] || stats['(未分類)'];
    catStats.total++;
    catStats.tags.push(result);
    if (result.changed) {
      catStats.changed++;
    }
  }

  // 統計サマリー
  console.log('## マッピング統計サマリー');
  console.log('| カテゴリ | タグ数 | 変更あり | 変更なし |');
  console.log('|:---|---:|---:|---:|');

  let totalTags = 0;
  let totalChanged = 0;

  for (const cat of tagCategories) {
    const s = stats[cat.id];
    if (filterCategory && cat.id !== filterCategory) continue;
    console.log(`| ${cat.name} (${cat.id}) | ${s.total} | ${s.changed} | ${s.total - s.changed} |`);
    totalTags += s.total;
    totalChanged += s.changed;
  }

  console.log(`| **合計** | **${totalTags}** | **${totalChanged}** | **${totalTags - totalChanged}** |`);
  console.log('');

  // カテゴリ別詳細
  if (verbose || filterCategory) {
    console.log('## カテゴリ別タグ詳細\n');

    for (const cat of tagCategories) {
      if (filterCategory && cat.id !== filterCategory) continue;

      const s = stats[cat.id];
      if (s.tags.length === 0) continue;

      console.log(`### ${cat.name} (${cat.id}) - ${s.total}個\n`);

      // 使用回数順にソート
      const sortedTags = s.tags.sort((a, b) => b.count - a.count);

      // 上位20件を表示
      const displayTags = verbose ? sortedTags : sortedTags.slice(0, 20);

      for (const tag of displayTags) {
        const changeMarker = tag.changed ? '🔄' : '✓';
        const fromCategory = tag.currentCategory || '(なし)';
        const displayInfo = tag.displayName ? ` (${tag.displayName})` : '';
        console.log(`  ${changeMarker} ${tag.tagName}${displayInfo}: ${tag.count}回 [${fromCategory} → ${tag.newCategory}]`);
      }

      if (!verbose && sortedTags.length > 20) {
        console.log(`  ... 他 ${sortedTags.length - 20}個\n`);
      }
      console.log('');
    }
  }

  // 変更があるタグのみ表示
  console.log('## 変更があるタグ (上位50件)\n');
  const changedTags = results
    .filter(r => r.changed)
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  if (changedTags.length === 0) {
    console.log('  変更があるタグはありません。\n');
  } else {
    for (const tag of changedTags) {
      const displayInfo = tag.displayName ? ` (${tag.displayName})` : '';
      console.log(`  ${tag.tagName}${displayInfo}: ${tag.count}回 [${tag.currentCategory || '(なし)'} → ${tag.newCategory}]`);
    }
    console.log('');
  }

  // 旧カテゴリからの移行先サマリー
  console.log('## 旧カテゴリ → 新カテゴリ 移行サマリー\n');

  const migrationStats: Record<string, Record<string, number>> = {};
  for (const result of results) {
    const from = result.currentCategory || '(未分類)';
    if (!migrationStats[from]) migrationStats[from] = {};
    migrationStats[from][result.newCategory] = (migrationStats[from][result.newCategory] || 0) + 1;
  }

  for (const [from, toStats] of Object.entries(migrationStats)) {
    console.log(`### ${from}`);
    for (const [to, count] of Object.entries(toStats).sort((a, b) => b[1] - a[1])) {
      const arrow = from === to ? '(維持)' : '→';
      console.log(`  ${arrow} ${to}: ${count}個`);
    }
    console.log('');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
