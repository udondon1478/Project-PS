import PQueue, { type Options as PQueueOptions } from 'p-queue';
import { setTimeout } from 'timers/promises';
import { getVrChatSearchUrl } from './urls';
import { boothHttpClient } from './http-client';
import { parseListingPage } from './listing-parser';
import { waitJitter } from './utils';

export interface CrawlerOptions {
  maxPages?: number;
  startPage?: number;
  onProductsFound?: (urls: string[], page: number) => Promise<void> | void;
}

export class ListingCrawler {
  private queue: PQueue;

  constructor(options?: { queue?: PQueue; queueOptions?: PQueueOptions<any, any> }) {
    if (options?.queue) {
      this.queue = options.queue;
    } else {
      this.queue = new PQueue(
        options?.queueOptions || {
          concurrency: 1,
          interval: 2500,
          intervalCap: 1,
        }
      );
    }
  }



  private async fetchPageWithRetry(page: number, attempt = 1): Promise<{ productUrls: string[], hasNextPage: boolean }> {
    const url = getVrChatSearchUrl(page);

    try {
      // Jitter before fetch
      await waitJitter();
      
      console.log(`[Crawler] Fetching page ${page} (Attempt ${attempt})...`);
      const res = await boothHttpClient.fetch(url);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      const html = await res.text();
      return parseListingPage(html);

    } catch (error: unknown) {
      // Don't retry on 404
      if (error instanceof Error && error.message.includes('HTTP 404')) {
        console.error(`[Crawler] Page ${page} not found (404). Stopping retries.`);
        return { productUrls: [], hasNextPage: false };
      }

      const isLastAttempt = attempt >= 4; // 1 (initial) + 3 retries
      if (isLastAttempt) {
        console.error(`[Crawler] Failed page ${page} after ${attempt} attempts. Giving up. Error: ${error}`);
        return { productUrls: [], hasNextPage: false };
      }

      // Retry Delays:
      // Attempt 1 fail -> Retry 1 (Immediate) -> attempt=2
      // Attempt 2 fail -> Retry 2 (5s) -> attempt=3
      // Attempt 3 fail -> Retry 3 (15s) -> attempt=4
      let delay = 0;
      if (attempt === 1) delay = 0;
      else if (attempt === 2) delay = 5000;
      else delay = 15000;

      console.warn(`[Crawler] Error on page ${page}: ${error instanceof Error ? error.message : String(error)}. Retrying in ${delay}ms...`);
      if (delay > 0) await setTimeout(delay);
      
      return this.fetchPageWithRetry(page, attempt + 1);
    }
  }

  /**
   * Starts scraping from startPage (default 1) up to maxPages.
   */
  async run(options: CrawlerOptions = {}) {
    let currentPage = options.startPage || 1;
    let hasNext = true;
    const maxPages = options.maxPages ? currentPage + options.maxPages - 1 : Infinity;

    console.log(`[Crawler] Starting crawl. Start page: ${currentPage}, Max pages: ${options.maxPages || 'Unlimited'}`);

    while (hasNext && currentPage <= maxPages) {
      // Fetch listing page (throttled by queue)
      const result = await this.queue.add(() => this.fetchPageWithRetry(currentPage));
      
      if (!result) break; // Should not happen based on fetchPageWithRetry return but safe guard

      const { productUrls, hasNextPage } = result;
      
      // Process found products (can use the same queue externally if passed)
      if (productUrls.length > 0) {
        console.log(`[Crawler] Page ${currentPage}: Found ${productUrls.length} products.`);
        if (options.onProductsFound) {
          await options.onProductsFound(productUrls, currentPage);
        }
      } else {
        console.log(`[Crawler] Page ${currentPage}: No products found.`);
      }

      hasNext = hasNextPage;
      
      if (!hasNext) {
        console.log('[Crawler] No next page found. Stopping.');
      }
      
      currentPage++;
    }
    
    console.log('[Crawler] Crawl finished.');
  }
}
