/**
 * avatar-catalog.com データインポートスクリプト
 *
 * sitemapからアバターページURL一覧を取得し、各ページから
 * 美学カテゴリ・性別傾向・Quest対応情報を抽出。
 * PolySeekのDBでBOOTH IDによる商品突合を行い、タグを付与する。
 *
 * Usage:
 *   npx tsx src/scripts/import-avatar-catalog.ts [--dry-run] [--limit N]
 */

import { prisma } from '@/lib/prisma';
import { TagResolver } from '@/lib/booth-scraper/tag-resolver';
import * as cheerio from 'cheerio';

const SITEMAP_URL = 'https://avatar-catalog.com/sitemap.xml';
const CRAWL_DELAY_MS = 2000; // 2秒間隔（robots.txt準拠）
const USER_AGENT = 'PolySeek/1.0 (Avatar Catalog Importer; +https://polyseek.com)';

interface AvatarCatalogEntry {
  pageUrl: string;
  boothId: string | null;
  aestheticCategory: string | null;
  genderTendency: string | null; // female / male / androgynous
  questCompatible: boolean | null;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : Infinity;

  console.log(`[ImportAvatarCatalog] Starting import... (dryRun: ${dryRun}, limit: ${limit === Infinity ? 'none' : limit})`);

  // 1. robots.txt チェック
  const robotsAllowed = await checkRobotsTxt();
  if (!robotsAllowed) {
    console.error('[ImportAvatarCatalog] robots.txt disallows crawling. Aborting.');
    process.exit(1);
  }

  // 2. Sitemap取得
  const avatarUrls = await fetchSitemapUrls();
  console.log(`[ImportAvatarCatalog] Found ${avatarUrls.length} avatar pages in sitemap`);

  const tagResolver = new TagResolver(prisma);
  let processed = 0;
  let matched = 0;
  let tagged = 0;
  let errors = 0;

  // 3. 各ページをクロール
  for (const url of avatarUrls) {
    if (processed >= limit) break;

    try {
      await sleep(CRAWL_DELAY_MS);

      const entry = await crawlAvatarPage(url);
      processed++;

      if (!entry.boothId) {
        continue;
      }

      // 4. BOOTH IDで商品突合
      const boothJpUrl = `https://booth.pm/ja/items/${entry.boothId}`;
      const product = await prisma.product.findUnique({
        where: { boothJpUrl },
        select: { id: true },
      });

      if (!product) {
        continue;
      }

      matched++;

      if (dryRun) {
        console.log(`[DRY RUN] Would tag product ${product.id} (BOOTH ${entry.boothId}): aesthetic=${entry.aestheticCategory}, gender=${entry.genderTendency}, quest=${entry.questCompatible}`);
        continue;
      }

      // 5. タグ付与 (source: 'import')
      const tagsToAdd: Array<{ name: string; category: string }> = [];

      if (entry.aestheticCategory) {
        tagsToAdd.push({ name: entry.aestheticCategory, category: 'aesthetic' });
      }

      if (entry.genderTendency) {
        const genderTagMap: Record<string, string> = {
          female: '女性向け',
          male: '男性向け',
          androgynous: '中性的',
        };
        const genderTag = genderTagMap[entry.genderTendency];
        if (genderTag) {
          tagsToAdd.push({ name: genderTag, category: 'body' });
        }
      }

      if (entry.questCompatible === true) {
        tagsToAdd.push({ name: 'Quest対応', category: 'platform' });
      }

      for (const tag of tagsToAdd) {
        try {
          const tagId = await tagResolver.resolveTagWithCategory(tag.name, tag.category);
          await prisma.productTag.upsert({
            where: {
              productId_tagId_source_isOfficial: {
                productId: product.id,
                tagId,
                source: 'import',
                isOfficial: false,
              },
            },
            update: {},
            create: {
              productId: product.id,
              tagId,
              source: 'import',
              confidence: 0.9,
              isOfficial: false,
            },
          });
          tagged++;
        } catch (e) {
          console.warn(`[ImportAvatarCatalog] Failed to tag product ${product.id} with "${tag.name}":`, e);
        }
      }

      if (processed % 100 === 0) {
        console.log(`[ImportAvatarCatalog] Progress: ${processed}/${avatarUrls.length} processed, ${matched} matched, ${tagged} tags added`);
      }
    } catch (error) {
      errors++;
      console.error(`[ImportAvatarCatalog] Error processing ${url}:`, error);
    }
  }

  console.log(`[ImportAvatarCatalog] Complete!`);
  console.log(`  Processed: ${processed}`);
  console.log(`  Matched:   ${matched}`);
  console.log(`  Tags added: ${tagged}`);
  console.log(`  Errors:    ${errors}`);

  await prisma.$disconnect();
}

/**
 * robots.txtを確認し、sitemapとアバターページへのアクセスが許可されているか確認
 */
async function checkRobotsTxt(): Promise<boolean> {
  try {
    const res = await fetch('https://avatar-catalog.com/robots.txt', {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) {
      // robots.txtが存在しない場合は許可とみなす
      return true;
    }
    const text = await res.text();
    // 簡易チェック: Disallow: / が含まれていないか
    if (text.includes('Disallow: /') && !text.includes('Disallow: /\n')) {
      // 全面禁止の可能性
      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim().toLowerCase();
        if (trimmed === 'disallow: /') {
          console.warn('[ImportAvatarCatalog] robots.txt contains "Disallow: /"');
          return false;
        }
      }
    }
    return true;
  } catch {
    // ネットワークエラーの場合は安全側で拒否
    return false;
  }
}

/**
 * sitemapからアバターページのURLを取得
 */
async function fetchSitemapUrls(): Promise<string[]> {
  const res = await fetch(SITEMAP_URL, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch sitemap: ${res.status}`);
  }

  const xml = await res.text();
  const $ = cheerio.load(xml, { xmlMode: true });

  const urls: string[] = [];
  $('url > loc').each((_, el) => {
    const loc = $(el).text().trim();
    // アバター詳細ページのみ抽出（/avatar/ パスを含むもの）
    if (loc.includes('/avatar/') || loc.includes('/avatars/')) {
      urls.push(loc);
    }
  });

  return urls;
}

/**
 * アバターページをクロールして情報を抽出
 */
async function crawlAvatarPage(url: string): Promise<AvatarCatalogEntry> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  // BOOTH商品IDの抽出（BOOTHリンクから）
  let boothId: string | null = null;
  $('a[href*="booth.pm"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const match = href.match(/booth\.pm\/(?:ja|en)\/items\/(\d+)/);
    if (match) {
      boothId = match[1];
    }
  });

  // 美学カテゴリの抽出
  // avatar-catalog.comの構造に依存するため、実際のHTML構造に合わせて調整が必要
  let aestheticCategory: string | null = null;
  // メタデータやクラスからカテゴリ情報を探す
  const categoryEl = $('[data-category], .avatar-category, .aesthetic-tag').first();
  if (categoryEl.length > 0) {
    aestheticCategory = categoryEl.text().trim() || categoryEl.attr('data-category') || null;
  }

  // JSON-LDやmeta tagからの抽出も試行
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const jsonLd = JSON.parse($(el).html() || '{}');
      if (jsonLd.category) {
        aestheticCategory = aestheticCategory || jsonLd.category;
      }
    } catch { /* ignore parse errors */ }
  });

  // 性別傾向の抽出
  let genderTendency: string | null = null;
  const bodyText = $('body').text().toLowerCase();
  if (bodyText.includes('female') || bodyText.includes('女性')) {
    genderTendency = 'female';
  } else if (bodyText.includes('male') || bodyText.includes('男性')) {
    genderTendency = 'male';
  } else if (bodyText.includes('androgynous') || bodyText.includes('中性')) {
    genderTendency = 'androgynous';
  }

  // Quest対応の抽出
  let questCompatible: boolean | null = null;
  if (bodyText.includes('quest対応') || bodyText.includes('quest compatible')) {
    questCompatible = true;
  } else if (bodyText.includes('pc only') || bodyText.includes('pc専用')) {
    questCompatible = false;
  }

  return {
    pageUrl: url,
    boothId,
    aestheticCategory,
    genderTendency,
    questCompatible,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error('[ImportAvatarCatalog] Fatal error:', err);
  process.exit(1);
});
