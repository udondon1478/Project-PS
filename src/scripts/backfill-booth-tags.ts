import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { boothHttpClient } from '@/lib/booth-scraper/http-client';
import { parseProductJson, parseProductPage } from '@/lib/booth-scraper/product-parser';
import { TagResolver } from '@/lib/booth-scraper/tag-resolver';
import { waitJitter } from '@/lib/booth-scraper/utils';
import { SYSTEM_USER_EMAIL, DEFAULT_REQUEST_INTERVAL_MS } from '@/lib/constants';

const JITTER_VARIANCE_MS = 1000;

export async function fetchTagsFromBooth(
  boothJpUrl: string,
): Promise<{ tagNames: string[]; ageRating: string | null } | null> {
  try {
    const response = await boothHttpClient.fetch(`${boothJpUrl}.json`);
    if (response.ok) {
      const json = await response.json();
      const result = parseProductJson(json, boothJpUrl);
      return { tagNames: result.tags, ageRating: result.ageRating };
    }
  } catch (error) {
    console.log(`JSON API failed for ${boothJpUrl}: ${error instanceof Error ? error.message : error}`);
  }

  try {
    const response = await boothHttpClient.fetch(boothJpUrl);
    if (!response.ok) return null;
    const html = await response.text();
    const result = parseProductPage(html, boothJpUrl);
    if (!result) return null;
    return { tagNames: result.tags, ageRating: result.ageRating };
  } catch (error) {
    console.log(`HTML scraping also failed for ${boothJpUrl}: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

export async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    const systemUser = await prisma.user.findUnique({
      where: { email: SYSTEM_USER_EMAIL },
    });

    if (!systemUser) {
      throw new Error(`System user not found: ${SYSTEM_USER_EMAIL}`);
    }

    const products = await prisma.product.findMany({
      where: { productTags: { none: { isOfficial: true } } },
      select: { id: true, boothJpUrl: true, title: true },
    });

    console.log(`Found ${products.length} products without official tags`);

    const tagResolver = new TagResolver(prisma);
    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (const product of products) {
      try {
        await waitJitter(DEFAULT_REQUEST_INTERVAL_MS, JITTER_VARIANCE_MS);

        const fetchResult = await fetchTagsFromBooth(product.boothJpUrl);
        if (!fetchResult) {
          skipCount++;
          console.log(`[${successCount + failCount + skipCount}/${products.length}] Skip (fetch failed): ${product.title}`);
          continue;
        }

        const tagIds = await tagResolver.resolveTags(fetchResult.tagNames);
        const ageRatingTagId = await tagResolver.resolveAgeRating(fetchResult.ageRating);

        const allTagIds = [...new Set([...tagIds, ...(ageRatingTagId ? [ageRatingTagId] : [])])];

        if (allTagIds.length === 0) {
          skipCount++;
          console.log(`[${successCount + failCount + skipCount}/${products.length}] Skip (no tags): ${product.title}`);
          continue;
        }

        await prisma.productTag.createMany({
          data: allTagIds.map((tagId) => ({
            productId: product.id,
            tagId,
            userId: systemUser.id,
            isOfficial: true,
          })),
          skipDuplicates: true,
        });

        successCount++;
        console.log(`[${successCount + failCount + skipCount}/${products.length}] OK: ${product.title} (${allTagIds.length} tags)`);
      } catch (error) {
        failCount++;
        console.error(`[${successCount + failCount + skipCount}/${products.length}] Error: ${product.title}`, error);
      }
    }

    console.log(`\nComplete: ${successCount} succeeded, ${failCount} failed, ${skipCount} skipped`);
  } finally {
    await prisma.$disconnect();
  }
}

// テストからimport時にmain()自動実行を防ぐ
// resolve()でパスを正規化し、Windows/Unix両方で動作するようにする
if (resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
