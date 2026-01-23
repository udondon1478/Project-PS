/**
 * 実際に使用されているタグの分析スクリプト
 * ProductTagテーブルから商品に紐づけられているタグを分析
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyze() {
  console.log('=== 実際に使用されているタグの分析 ===\n');

  // 1. ProductTagから実際の使用回数を集計
  const tagUsage = await prisma.productTag.groupBy({
    by: ['tagId'],
    _count: { tagId: true },
    orderBy: { _count: { tagId: 'desc' } },
    take: 200
  });

  console.log('## 基本統計');
  const totalProductTags = await prisma.productTag.count();
  const totalProducts = await prisma.product.count();
  const totalTags = await prisma.tag.count();
  console.log(`- 商品数: ${totalProducts}`);
  console.log(`- 総タグ数: ${totalTags}`);
  console.log(`- 商品-タグ関連数: ${totalProductTags}`);
  console.log(`- 使用されているユニークタグ数: ${tagUsage.length}`);
  console.log('');

  // 2. 上位タグの詳細を取得
  const topTagIds = tagUsage.map(t => t.tagId);
  const topTags = await prisma.tag.findMany({
    where: { id: { in: topTagIds } },
    include: { tagCategory: true }
  });

  // IDでマップ化
  const tagMap = new Map(topTags.map(t => [t.id, t]));

  // 使用回数マップ
  const usageMap = new Map(tagUsage.map(t => [t.tagId, t._count.tagId]));

  console.log('## 使用回数上位50タグ');
  console.log('| 順位 | タグ名 | 表示名 | 使用回数 | カテゴリ |');
  console.log('|---:|:---|:---|---:|:---|');

  for (let i = 0; i < Math.min(50, tagUsage.length); i++) {
    const usage = tagUsage[i];
    const tag = tagMap.get(usage.tagId);
    if (tag) {
      const catName = tag.tagCategory?.name || '(なし)';
      const displayName = tag.displayName || '-';
      console.log(`| ${i+1} | ${tag.name} | ${displayName} | ${usage._count.tagId} | ${catName} |`);
    }
  }
  console.log('');

  // 3. カテゴリ別集計
  console.log('## カテゴリ別使用状況');
  const catStats: Record<string, { count: number; usage: number; tags: string[] }> = {};

  for (const tag of topTags) {
    const catName = tag.tagCategory?.name || '(未分類)';
    const usage = usageMap.get(tag.id) || 0;

    if (!catStats[catName]) {
      catStats[catName] = { count: 0, usage: 0, tags: [] };
    }
    catStats[catName].count++;
    catStats[catName].usage += usage;
    if (catStats[catName].tags.length < 5) {
      catStats[catName].tags.push(tag.displayName || tag.name);
    }
  }

  const sortedCats = Object.entries(catStats).sort((a, b) => b[1].usage - a[1].usage);
  console.log('| カテゴリ | タグ数 | 使用回数 | 例 |');
  console.log('|:---|---:|---:|:---|');
  for (const [cat, stats] of sortedCats) {
    console.log(`| ${cat} | ${stats.count} | ${stats.usage} | ${stats.tags.slice(0, 3).join(', ')} |`);
  }
  console.log('');

  // 4. タグ名パターン分析
  console.log('## タグ名パターン分析（使用中タグ）\n');

  const patterns: Record<string, { regex: RegExp; suggestedCategory: string }> = {
    '髪型・髪色': { regex: /hair|髪|ヘア/i, suggestedCategory: 'body' },
    '瞳・目': { regex: /eye|目|瞳|アイ/i, suggestedCategory: 'body' },
    '耳': { regex: /ear|耳|みみ/i, suggestedCategory: 'body' },
    '尻尾': { regex: /tail|尻尾|しっぽ|テール/i, suggestedCategory: 'body' },
    '衣装・服': { regex: /outfit|服|dress|uniform|costume|衣装|コスチューム/i, suggestedCategory: 'outfit' },
    '水着・下着': { regex: /swimsuit|bikini|水着|下着|ビキニ/i, suggestedCategory: 'outfit' },
    'アクセサリー': { regex: /glasses|ribbon|choker|hat|帽子|メガネ|眼鏡|リボン/i, suggestedCategory: 'outfit' },
    'Quest対応': { regex: /quest/i, suggestedCategory: 'platform' },
    'PC関連': { regex: /\bpc\b|PC専用|pc専用/i, suggestedCategory: 'platform' },
    'VRM': { regex: /vrm/i, suggestedCategory: 'platform' },
    'シェーダー': { regex: /toon|shader|poiyomi|liltoon|シェーダ/i, suggestedCategory: 'technical' },
    'Unity': { regex: /unity/i, suggestedCategory: 'technical' },
    'ファイル形式': { regex: /fbx|unitypackage|blend/i, suggestedCategory: 'technical' },
    'PhysBone': { regex: /physbone|phys_bone|フィズボーン/i, suggestedCategory: 'feature' },
    '対応アバター': { regex: /対応$/i, suggestedCategory: 'feature' },
    'カスタマイズ': { regex: /着せ替え|色替え|トグル|toggle|customiz/i, suggestedCategory: 'feature' },
    'ケモノ・Furry': { regex: /kemono|ケモノ|furry|ファーリー/i, suggestedCategory: 'style' },
    'アニメ調': { regex: /anime|アニメ/i, suggestedCategory: 'style' },
    'アバター名': { regex: /avatar|アバター/i, suggestedCategory: 'avatar' },
    'レーティング': { regex: /r-?18|r-?15|全年齢|成人/i, suggestedCategory: 'rating' },
  };

  for (const [patternName, { regex, suggestedCategory }] of Object.entries(patterns)) {
    const matchingTags = topTags.filter(t =>
      regex.test(t.name) || regex.test(t.displayName || '')
    );

    if (matchingTags.length > 0) {
      console.log(`### ${patternName} → ${suggestedCategory} (${matchingTags.length}個)`);
      const sorted = matchingTags
        .map(t => ({ tag: t, usage: usageMap.get(t.id) || 0 }))
        .sort((a, b) => b.usage - a.usage);

      for (const { tag, usage } of sorted.slice(0, 10)) {
        const currentCatId = tag.tagCategoryId || '';
        const currentCatName = tag.tagCategory?.name || '(なし)';
        const marker = currentCatId === suggestedCategory ? '✓' : '→';
        console.log(`  ${marker} ${tag.displayName || tag.name}: ${usage}回 [現在: ${currentCatName}]`);
      }
      if (sorted.length > 10) {
        console.log(`  ... 他 ${sorted.length - 10}個`);
      }
      console.log('');
    }
  }

  // 5. 未分類タグの分析
  console.log('## 未分類タグ（上位30）');
  const uncategorized = topTags
    .filter(t => !t.tagCategoryId)
    .map(t => ({ tag: t, usage: usageMap.get(t.id) || 0 }))
    .sort((a, b) => b.usage - a.usage)
    .slice(0, 30);

  if (uncategorized.length > 0) {
    console.log('| タグ名 | 表示名 | 使用回数 | 推奨カテゴリ |');
    console.log('|:---|:---|---:|:---|');

    for (const { tag, usage } of uncategorized) {
      // パターンマッチで推奨カテゴリを判定
      let suggested = 'general';
      for (const [, { regex, suggestedCategory }] of Object.entries(patterns)) {
        if (regex.test(tag.name) || regex.test(tag.displayName || '')) {
          suggested = suggestedCategory;
          break;
        }
      }
      console.log(`| ${tag.name} | ${tag.displayName || '-'} | ${usage} | ${suggested} |`);
    }
  } else {
    console.log('未分類のタグはありません。');
  }
  console.log('');

  // 6. カテゴリ設計の推奨
  console.log('## カテゴリ設計の評価\n');

  const categoryUsage = sortedCats.reduce((acc, [cat, stats]) => {
    acc[cat] = stats.usage;
    return acc;
  }, {} as Record<string, number>);

  const uncategorizedUsage = categoryUsage['(未分類)'] || 0;
  const totalUsage = Object.values(categoryUsage).reduce((a, b) => a + b, 0);
  const uncategorizedRatio = totalUsage > 0 ? (uncategorizedUsage / totalUsage * 100).toFixed(1) : '0';

  console.log(`- 未分類タグの使用率: ${uncategorizedRatio}%`);
  console.log(`- カテゴリ付きタグの使用率: ${(100 - parseFloat(uncategorizedRatio)).toFixed(1)}%`);
}

analyze()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
