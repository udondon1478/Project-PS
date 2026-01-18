/**
 * プロモーション用DB: ショップ単位での商品一括登録スクリプト
 *
 * 使用方法:
 *   npm run promo:add-shop https://example-shop.booth.pm/
 *
 * 機能:
 * 1. ショップURLから商品一覧を取得
 * 2. 各商品の詳細情報とタグをスクレイピング
 * 3. プロモーション用DBに保存
 */

import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';
import { boothHttpClient } from '@/lib/booth-scraper/http-client';
import { parseProductPage, parseProductJson } from '@/lib/booth-scraper/product-parser';
import { createProductFromScraper, ScrapedProductData } from '@/lib/booth-scraper/product-creator';
import { waitJitter } from '@/lib/booth-scraper/utils';
import { SYSTEM_USER_EMAIL } from '@/lib/constants';

const prisma = new PrismaClient();

interface ShopProduct {
  url: string;
  title: string;
}

/**
 * ショップページから商品一覧を取得
 */
async function fetchShopProducts(shopUrl: string): Promise<ShopProduct[]> {
  const products: ShopProduct[] = [];
  let page = 1;
  let hasNextPage = true;

  console.log(`[AddShop] ショップから商品一覧を取得中: ${shopUrl}`);

  while (hasNextPage) {
    const url = page === 1 ? shopUrl : `${shopUrl}?page=${page}`;

    await waitJitter(2000, 1000);
    console.log(`[AddShop] ページ ${page} を取得中...`);

    const res = await boothHttpClient.fetch(url);

    if (!res.ok) {
      if (res.status === 404) {
        console.log(`[AddShop] ページ ${page} が見つかりません (404)`);
        break;
      }
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // ショップページの商品リンクを取得
    $('.item-card__title a, .shop-item-card a[href*="/items/"]').each((_, element) => {
      const href = $(element).attr('href');
      const title = $(element).text().trim();

      if (href && href.includes('/items/')) {
        let fullUrl = href;
        if (href.startsWith('/')) {
          fullUrl = `https://booth.pm${href}`;
        }

        // 重複チェック
        if (!products.some(p => p.url === fullUrl)) {
          products.push({ url: fullUrl, title: title || 'Unknown' });
        }
      }
    });

    // ページネーションの確認
    const nextLink = $('.pager .next a, a[rel="next"]').attr('href');
    hasNextPage = !!nextLink;
    page++;

    // 安全装置: 100ページ以上はループしない
    if (page > 100) {
      console.log('[AddShop] 100ページに達したため停止');
      break;
    }
  }

  console.log(`[AddShop] 合計 ${products.length} 件の商品を発見`);
  return products;
}

/**
 * 商品詳細ページをスクレイピングしてパース
 */
async function fetchProductDetails(productUrl: string): Promise<ScrapedProductData | null> {
  await waitJitter(2000, 1000);

  const res = await boothHttpClient.fetch(productUrl);

  if (!res.ok) {
    console.error(`[AddShop] 商品ページ取得失敗: ${productUrl} (${res.status})`);
    return null;
  }

  const html = await res.text();

  // JSON APIを試行（より信頼性が高い）
  const jsonUrl = productUrl.replace('/items/', '/items/') + '.json';
  try {
    await waitJitter(1000, 500);
    const jsonRes = await boothHttpClient.fetch(jsonUrl);
    if (jsonRes.ok) {
      const json = await jsonRes.json();
      const parsed = parseProductJson(json, productUrl);
      return {
        boothJpUrl: productUrl,
        boothEnUrl: productUrl.replace('/ja/', '/en/'),
        title: parsed.title,
        description: parsed.description,
        price: parsed.price,
        images: parsed.images,
        tags: parsed.tags,
        ageRating: parsed.ageRating,
        sellerName: parsed.sellerName,
        sellerUrl: parsed.sellerUrl,
        sellerIconUrl: parsed.sellerIconUrl,
        publishedAt: parsed.publishedAt,
        variations: parsed.variations,
      };
    }
  } catch {
    // JSON取得失敗時はHTMLパースにフォールバック
  }

  // HTMLパースにフォールバック
  const parsed = parseProductPage(html, productUrl);

  if (!parsed) {
    console.error(`[AddShop] 商品ページパース失敗: ${productUrl}`);
    return null;
  }

  return {
    boothJpUrl: productUrl,
    boothEnUrl: productUrl.replace('/ja/', '/en/'),
    title: parsed.title,
    description: parsed.description,
    price: parsed.price,
    images: parsed.images,
    tags: parsed.tags,
    ageRating: parsed.ageRating,
    sellerName: parsed.sellerName,
    sellerUrl: parsed.sellerUrl,
    sellerIconUrl: parsed.sellerIconUrl,
    publishedAt: parsed.publishedAt,
    variations: parsed.variations,
  };
}

/**
 * ショップURLを正規化
 */
function normalizeShopUrl(input: string): string {
  let url = input.trim();

  // プロトコルがない場合は追加
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  // 末尾のスラッシュを削除
  url = url.replace(/\/+$/, '');

  return url;
}

/**
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('使用方法: npm run promo:add-shop <ショップURL>');
    console.error('例: npm run promo:add-shop https://example-shop.booth.pm/');
    process.exit(1);
  }

  const shopUrl = normalizeShopUrl(args[0]);
  console.log(`\n=== プロモーション用DB: ショップ登録 ===`);
  console.log(`ショップURL: ${shopUrl}\n`);

  // システムユーザーの取得
  const systemUser = await prisma.user.findUnique({
    where: { email: SYSTEM_USER_EMAIL },
  });

  if (!systemUser) {
    console.error(`システムユーザーが見つかりません: ${SYSTEM_USER_EMAIL}`);
    console.error('先に npm run db:promo:seed を実行してください。');
    process.exit(1);
  }

  console.log(`システムユーザーID: ${systemUser.id}`);

  // ショップから商品一覧を取得
  const shopProducts = await fetchShopProducts(shopUrl);

  if (shopProducts.length === 0) {
    console.log('商品が見つかりませんでした。');
    process.exit(0);
  }

  // 既存の商品をチェック
  const existingProducts = await prisma.product.findMany({
    where: {
      boothJpUrl: {
        in: shopProducts.map(p => p.url),
      },
    },
    select: { boothJpUrl: true },
  });

  const existingUrls = new Set(existingProducts.map(p => p.boothJpUrl));
  const newProducts = shopProducts.filter(p => !existingUrls.has(p.url));

  console.log(`\n[AddShop] 既存: ${existingUrls.size} 件, 新規: ${newProducts.length} 件\n`);

  if (newProducts.length === 0) {
    console.log('すべての商品が既に登録済みです。');
    process.exit(0);
  }

  // 各商品を登録
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < newProducts.length; i++) {
    const product = newProducts[i];
    console.log(`\n[${i + 1}/${newProducts.length}] ${product.title}`);
    console.log(`URL: ${product.url}`);

    try {
      const details = await fetchProductDetails(product.url);

      if (!details) {
        console.error('  → 詳細取得失敗');
        failCount++;
        continue;
      }

      await createProductFromScraper(details, systemUser.id);
      console.log('  → 登録成功');
      successCount++;
    } catch (error) {
      console.error('  → 登録失敗:', error instanceof Error ? error.message : String(error));
      failCount++;
    }
  }

  console.log(`\n=== 完了 ===`);
  console.log(`成功: ${successCount} 件`);
  console.log(`失敗: ${failCount} 件`);
  console.log(`スキップ (既存): ${existingUrls.size} 件`);
}

main()
  .catch((error) => {
    console.error('エラー:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
