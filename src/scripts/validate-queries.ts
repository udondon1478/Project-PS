import dotenv from 'dotenv';
import { boothHttpClient } from '../lib/booth-scraper/http-client.js';
import { parseListingPage } from '../lib/booth-scraper/listing-parser.js';
import { parseProductPage } from '../lib/booth-scraper/product-parser.js';
import { addScrapedItemToNotion } from '../lib/notion-client.js';

// Load environment variables
dotenv.config();

// Validation URLs
const TARGET_URLS = [
  { name: '全検索', url: 'https://booth.pm/ja/items?sort=new&tags%5B%5D=VRChat&adult=include' },
  { name: '3Dモデル+VRChat', url: 'https://booth.pm/ja/browse/3Dモデル?adult=include&sort=new&tags%5B%5D=VRChat' },
  { name: '3Dモデル+VRChat+マヌカ', url: 'https://booth.pm/ja/browse/3Dモデル?adult=include&sort=new&tags%5B%5D=VRChat&tags%5B%5D=%E3%83%9E%E3%83%8C%E3%82%AB' },
];

const ITEMS_PER_QUERY = 100;
const SLEEP_MS = 10000;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function validateQueries() {
  console.log('Starting validation process...');

  if (!process.env.NOTION_API_KEY || !process.env.NOTION_DATABASE_ID) {
    console.error('Error: NOTION_API_KEY and NOTION_DATABASE_ID must be set in .env');
    process.exit(1);
  }

  for (const target of TARGET_URLS) {
    console.log(`\nProcessing: ${target.name} (${target.url})`);

    try {
      // 1. Fetch listing page
      await sleep(SLEEP_MS);
      const listingRes = await boothHttpClient.fetch(target.url);
      if (!listingRes.ok) {
        console.error(`Failed to fetch listing page: ${listingRes.status}`);
        continue;
      }
      const listingHtml = await listingRes.text();

      // 2. Parse listing page
      const { productUrls } = parseListingPage(listingHtml);
      console.log(`Found ${productUrls.length} items. Processing top ${ITEMS_PER_QUERY}...`);

      const urlsAccept = productUrls.slice(0, ITEMS_PER_QUERY);

      for (const productUrl of urlsAccept) {
        try {
          console.log(`  Fetching product: ${productUrl}`);
          await sleep(SLEEP_MS);
          
          const productRes = await boothHttpClient.fetch(productUrl);
          if (!productRes.ok) {
            console.warn(`  Failed to fetch product page: ${productRes.status}`);
            continue;
          }
          const productHtml = await productRes.text();
          
          const productData = parseProductPage(productHtml, productUrl);
          
          if (productData) {
            // Safe access to images array
            const thumbnailUrl = productData.images?.length > 0 ? productData.images[0] : undefined;
            await addScrapedItemToNotion({
              title: productData.title,
              url: productUrl,
              price: productData.price.toString(),
              sourceQuery: target.name,
              isNoise: false,
              thumbnailUrl
            });
          } else {
            console.warn(`  Failed to parse product data for ${productUrl}`);
          }
          
        } catch (e) {
          console.error(`  Error processing product ${productUrl}:`, e);
        }
      }

    } catch (e) {
      console.error(`Error processing query ${target.name}:`, e);
    }
  }

  console.log('\nValidation process completed.');
}

validateQueries().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
