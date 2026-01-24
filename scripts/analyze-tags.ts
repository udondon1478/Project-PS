/**
 * タグ分析スクリプト
 * 本番DBからタグデータを取得し、カテゴリ設計の参考となる統計を出力
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== タグ分析開始 ===\n');

  // 1. 基本統計
  const totalTags = await prisma.tag.count();
  const totalCategories = await prisma.tagCategory.count();
  const tagsWithCategory = await prisma.tag.count({ where: { tagCategoryId: { not: null } } });
  const tagsWithoutCategory = await prisma.tag.count({ where: { tagCategoryId: null } });

  console.log('## 基本統計');
  console.log(`- 総タグ数: ${totalTags}`);
  console.log(`- 総カテゴリ数: ${totalCategories}`);
  console.log(`- カテゴリ付きタグ: ${tagsWithCategory}`);
  console.log(`- カテゴリなしタグ: ${tagsWithoutCategory}`);
  console.log('');

  // 2. カテゴリ別タグ数
  console.log('## カテゴリ別タグ数');
  const categoryStats = await prisma.tagCategory.findMany({
    include: {
      _count: {
        select: { tags: true }
      }
    }
  });

  for (const cat of categoryStats.sort((a, b) => b._count.tags - a._count.tags)) {
    console.log(`- ${cat.name}: ${cat._count.tags}個`);
  }
  console.log('');

  // 3. 使用回数上位タグ（count > 0）
  console.log('## 使用回数上位タグ (Top 50)');
  const topTags = await prisma.tag.findMany({
    where: { count: { gt: 0 } },
    orderBy: { count: 'desc' },
    take: 50,
    include: { tagCategory: true }
  });

  for (const tag of topTags) {
    const category = tag.tagCategory?.name || '(なし)';
    console.log(`- ${tag.name} (${tag.displayName || tag.name}): ${tag.count}回 [${category}]`);
  }
  console.log('');

  // 4. カテゴリなしの頻出タグ
  console.log('## カテゴリなしの頻出タグ (Top 30)');
  const uncategorizedTags = await prisma.tag.findMany({
    where: { tagCategoryId: null, count: { gt: 0 } },
    orderBy: { count: 'desc' },
    take: 30
  });

  for (const tag of uncategorizedTags) {
    console.log(`- ${tag.name} (${tag.displayName || tag.name}): ${tag.count}回`);
  }
  console.log('');

  // 5. タグ名パターン分析
  console.log('## タグ名パターン分析');
  const allTags = await prisma.tag.findMany({
    where: { count: { gt: 0 } },
    select: { name: true, displayName: true, count: true }
  });

  // パターン別にカウント
  const patterns = {
    hair: allTags.filter(t => t.name.includes('hair') || t.name.includes('髪')),
    eyes: allTags.filter(t => t.name.includes('eye') || t.name.includes('目') || t.name.includes('瞳')),
    outfit: allTags.filter(t => t.name.includes('outfit') || t.name.includes('服') || t.name.includes('uniform') || t.name.includes('dress')),
    quest: allTags.filter(t => t.name.toLowerCase().includes('quest')),
    pc: allTags.filter(t => t.name.toLowerCase().includes('pc') && !t.name.includes('npc')),
    shader: allTags.filter(t => t.name.toLowerCase().includes('toon') || t.name.toLowerCase().includes('shader') || t.name.toLowerCase().includes('poiyomi') || t.name.toLowerCase().includes('liltoon')),
    physbones: allTags.filter(t => t.name.toLowerCase().includes('physbone') || t.name.toLowerCase().includes('phys_bone')),
    kemono: allTags.filter(t => t.name.includes('kemono') || t.name.includes('ケモノ') || t.name.includes('furry')),
    avatar: allTags.filter(t => t.name.includes('avatar') || t.name.includes('アバター')),
    unity: allTags.filter(t => t.name.toLowerCase().includes('unity')),
    fbx: allTags.filter(t => t.name.toLowerCase().includes('fbx')),
    vrm: allTags.filter(t => t.name.toLowerCase().includes('vrm')),
  };

  for (const [pattern, tags] of Object.entries(patterns)) {
    console.log(`- ${pattern}: ${tags.length}個`);
    if (tags.length > 0 && tags.length <= 10) {
      for (const t of tags) {
        console.log(`  - ${t.name}: ${t.count}回`);
      }
    }
  }
  console.log('');

  // 6. 全タグリスト（count > 0, カテゴリ付き）
  console.log('## 全タグリスト (count > 0) - カテゴリ別');
  const categorizedTags = await prisma.tag.findMany({
    where: { count: { gt: 0 } },
    include: { tagCategory: true },
    orderBy: [
      { tagCategory: { name: 'asc' } },
      { count: 'desc' }
    ]
  });

  const byCategory: Record<string, typeof categorizedTags> = {};
  for (const tag of categorizedTags) {
    const catName = tag.tagCategory?.name || '(未分類)';
    if (!byCategory[catName]) byCategory[catName] = [];
    byCategory[catName].push(tag);
  }

  for (const [catName, tags] of Object.entries(byCategory)) {
    console.log(`\n### ${catName} (${tags.length}個)`);
    for (const tag of tags.slice(0, 20)) {
      console.log(`- ${tag.name}: ${tag.count}回`);
    }
    if (tags.length > 20) {
      console.log(`  ... 他 ${tags.length - 20}個`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
