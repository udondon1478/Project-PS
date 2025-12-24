import { prisma } from '@/lib/prisma';
import PQueue from 'p-queue';
import { ListingCrawler } from './listing-crawler';
import { checkExistingProducts } from './product-checker';
import { boothHttpClient } from './http-client';
import { parseProductPage } from './product-parser';
import { createProductFromScraper, ScrapedProductData } from './product-creator';


/**
 * Maximum number of products to process in a single backfill run.
 * This limit prevents overwhelming the system during extensive backfill operations.
 * Defaults to 9 products per run to keep batches small and manageable.
 */
const BACKFILL_PRODUCT_LIMIT = Number(process.env.BACKFILL_PRODUCT_LIMIT) || 9;

export type ScraperMode = 'NEW' | 'BACKFILL';

export interface ScraperOptions {
  pageLimit?: number;
  rateLimitOverride?: number; // interval in ms
  /**
   * 既存の商品チェック（checkExistingProducts）が失敗した場合の動作を指定します。
   * 
   * - 'continue': 空のセットで処理を続行し、すべての商品を新規として扱います。
   *               重複登録の試行が発生する可能性がありますが、DBのユニーク制約により
   *               実際の重複は防止されます。（デフォルト）
   * - 'stop': バッチ処理を停止し、エラーをログに記録します。
   *           データの整合性を優先する場合に使用してください。
   */
  onExistenceCheckFailure?: 'continue' | 'stop';
}

export interface ScraperStatus {
  runId: string;
  mode: ScraperMode;
  status: 'running' | 'completed' | 'failed' | 'stopping';
  progress: {
    pagesProcessed: number;
    productsFound: number;
    productsExisting: number;
    productsCreated: number;
    productsSkipped: number;
    productsFailed: number;
    lastProcessedPage: number;
  };
  timings: {
    startTime: number;
    endTime?: number;
    averageDelay: number;
  };
  logs: string[];
}

import { waitJitter } from './utils';

// Removed local waitJitter definition


class BoothScraperOrchestrator {
  private static instance: BoothScraperOrchestrator;
  private currentStatus: ScraperStatus | null = null;
  private queue: PQueue | null = null;
  private shouldStop = false;

  private constructor() {}

  public static getInstance(): BoothScraperOrchestrator {
    if (!BoothScraperOrchestrator.instance) {
      BoothScraperOrchestrator.instance = new BoothScraperOrchestrator();
    }
    return BoothScraperOrchestrator.instance;
  }

  public getStatus(): ScraperStatus | null {
    return this.currentStatus;
  }

  public async stop() {
    if (this.currentStatus && this.currentStatus.status === 'running') {
      this.shouldStop = true;
      this.currentStatus.status = 'stopping';
      if (this.queue) {
        this.queue.pause();
        this.queue.clear();
      }
    }
  }

  private options: ScraperOptions = {};

  public async start(mode: ScraperMode, userId: string, options: ScraperOptions = {}): Promise<string> {
    if (this.currentStatus?.status === 'running') {
      throw new Error('Scraper is already running');
    }
    
    this.options = options;

    this.shouldStop = false;
    
    // Check for interrupted run to resume
    const existingRun = await prisma.scraperRun.findFirst({
      where: {
        status: 'RUNNING',
        metadata: {
          path: ['mode'],
          equals: mode,
        },
      },
      orderBy: { startTime: 'desc' },
    });

    let runId: string;
    let startTime: number;
    let resumed = false;

    if (existingRun) {
      runId = existingRun.runId;
      startTime = existingRun.startTime.getTime();
      resumed = true;
      this.addLog(`Resuming interrupted run: ${runId}`);
    } else {
      runId = `run_${Date.now()}`;
      startTime = Date.now();
    }

    // Initialize Status
    this.currentStatus = {
      runId,
      mode,
      status: 'running',
      progress: {
        pagesProcessed: existingRun ? existingRun.processedPages : 0,
        productsFound: existingRun ? existingRun.productsFound : 0,
        productsExisting: 0,
        productsCreated: existingRun ? existingRun.productsCreated : 0,
        productsSkipped: 0,
        productsFailed: existingRun ? (existingRun.failedUrls?.length || 0) : 0,
        lastProcessedPage: existingRun?.lastProcessedPage || 0,
      },
      timings: {
        startTime,
        averageDelay: 0,
      },
      logs: [],
    };

    if (!resumed) {
      // Create new DB Record only if not resuming
      await prisma.scraperRun.create({
        data: {
          runId,
          status: 'RUNNING',
          startTime: new Date(startTime),
          metadata: { mode, options } as any,
        },
      });
    }

    this.runWorkflow(mode, userId, options, resumed).catch(async (err) => {
      console.error('Orchestrator Error:', err);
      if (this.currentStatus) {
        this.currentStatus.status = 'failed';
        this.currentStatus.logs.push(`Error: ${err instanceof Error ? err.message : String(err)}`);
        await this.finalizeRun();
      }
    });

    return runId;
  }

  private async runWorkflow(mode: ScraperMode, userId: string, options: ScraperOptions, resumed: boolean = false) {
    const isBackfill = mode === 'BACKFILL';
    
    const defaultInterval = isBackfill ? 4000 : 2500;
    const interval = options.rateLimitOverride || defaultInterval;
    
    this.queue = new PQueue({
      concurrency: 1,
      interval,
      intervalCap: 1,
    });

    let startPage = 1;
    let maxPages = isBackfill ? 10 : 3;
    
    if (options.pageLimit) {
      maxPages = options.pageLimit;
    }

    if (resumed && this.currentStatus?.progress.lastProcessedPage) {
        startPage = this.currentStatus.progress.lastProcessedPage + 1;
        this.addLog(`Run resumed from page ${startPage} (RunID: ${this.currentStatus.runId})`);
    } else if (isBackfill) {
      const lastBackfill = await prisma.scraperRun.findFirst({
        where: {
          status: 'COMPLETED',
          metadata: {
            path: ['mode'],
            equals: 'BACKFILL',
          },
        },
        orderBy: { endTime: 'desc' },
      });

      if (lastBackfill && lastBackfill.lastProcessedPage) {
        startPage = lastBackfill.lastProcessedPage + 1;
        this.addLog(`Resuming backfill from page ${startPage} (Last run: ${lastBackfill.runId})`);
      } else {
        this.addLog(`No previous backfill found, starting from page 1`);
        startPage = 1;
      }
    }

    const crawler = new ListingCrawler({
      queue: this.queue!,
    }); 

    this.addLog(`Starting crawl: Mode=${mode}, StartPage=${startPage}, MaxPages=${maxPages}, Interval=${interval}ms`);

    await crawler.run({
      startPage,
      maxPages,
      onProductsFound: async (urls, page) => {
        if (this.shouldStop) return;
        await this.processBatch(urls, page, userId, isBackfill);
        await this.updateDbProgress();
      }
    });

    if (this.currentStatus?.status !== 'failed') {
      this.currentStatus!.status = 'completed';
      if (this.currentStatus!.timings.endTime === undefined) {
          this.currentStatus!.timings.endTime = Date.now();
      }
      await this.finalizeRun();
    }
  }

  private async processBatch(urls: string[], page: number, userId: string, isBackfill: boolean) {
    if (!this.currentStatus) return;
    
    this.currentStatus.progress.lastProcessedPage = page;
    this.currentStatus.progress.pagesProcessed++;
    this.addLog(`Processing page ${page}: ${urls.length} products found`);
    this.currentStatus.progress.productsFound += urls.length;

    // Batch check existence
    let existingSet = new Set<string>();
    try {
        existingSet = await checkExistingProducts(urls);
    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.error('Failed to check existence:', errorMsg);
        
        const failureAction = this.options.onExistenceCheckFailure ?? 'continue';
        
        if (failureAction === 'stop') {
            // 整合性優先: バッチ処理を停止
            this.addLog(`Existence check failed, stopping batch as configured: ${errorMsg}`);
            this.currentStatus.progress.productsFailed += urls.length;
            return; // このバッチをスキップ
        } else {
            // 継続モード（デフォルト）: 空のセットで続行
            // 注意: すべての商品が新規として扱われ、DBのユニーク制約により
            // 既存商品の重複登録試行は失敗しますが、処理は継続されます
            this.addLog(`Existence check failed, continuing with empty set (may cause duplicate insert attempts): ${errorMsg}`);
        }
    }

    // Filter out existing
    // For backfill, existing means "already scanned".
    // For new scan, existing means "already scanned".
    const newUrls = urls.filter(u => !existingSet.has(u));
    this.currentStatus.progress.productsExisting += (urls.length - newUrls.length);

    // Prompt: "process 9 products only" in backfill mode.
    // Assuming this means "Limit the NUMBER OF PRODUCTS SCRAPED per run".
    // If we skip existing, we are not "processing" them in the scraping sense.
    // So we count creates + fails?
    
    for (const url of newUrls) {
       if (this.shouldStop) return;

       if (isBackfill) {
         const processedCount = this.currentStatus.progress.productsCreated + this.currentStatus.progress.productsSkipped + this.currentStatus.progress.productsFailed;
         // Why 9? 9 items is very specific. 
         // "process 9 products only" (9商品のみ処理).
         if (processedCount >= BACKFILL_PRODUCT_LIMIT) {
           this.addLog(`Backfill limit of ${BACKFILL_PRODUCT_LIMIT} products reached. Stopping.`);
           this.shouldStop = true;
           return;
         }
       }

       // Add to queue
       await this.queue!.add(async () => {
         try {
           await waitJitter(); // Add random jitter

           const res = await boothHttpClient.fetch(url);
           if (!res.ok) {
             this.currentStatus!.progress.productsFailed++;
             this.addLog(`Failed to fetch ${url}: ${res.status}`);
             return;
           }
           const html = await res.text();
           const data = parseProductPage(html, url);
           
           if (data) {
             const productData: ScrapedProductData = {
                ...data,
                boothJpUrl: url
             };
             await createProductFromScraper(productData, userId);
             this.currentStatus!.progress.productsCreated++;
           } else {
             this.currentStatus!.progress.productsFailed++;
             this.addLog(`Failed to parse ${url}`);
           }

          } catch (error: unknown) {
            let msg: string;
            if (error instanceof Error) {
              msg = error.message;
            } else if (typeof error === 'object' && error !== null && 'message' in error) {
              msg = String((error as any).message);
            } else {
              msg = String(error);
            }
            this.currentStatus!.progress.productsFailed++;
            this.addLog(`Error processing ${url}: ${msg}`);
          }
       });
    }
  }

  private addLog(msg: string) {
    if (this.currentStatus) {
      this.currentStatus.logs.push(`[${new Date().toISOString()}] ${msg}`);
      if (this.currentStatus.logs.length > 100) this.currentStatus.logs.shift();
    }
    console.log(`[Orchestrator] ${msg}`);
  }

  private async updateDbProgress() {
    if (!this.currentStatus) return;
    try {
      await prisma.scraperRun.update({
        where: { runId: this.currentStatus.runId },
        data: {
          productsFound: this.currentStatus.progress.productsFound,
          productsCreated: this.currentStatus.progress.productsCreated,
          processedPages: this.currentStatus.progress.pagesProcessed,
        }
      });
    } catch (e) {
      console.error('Failed to update ScraperRun:', e);
    }
  }

  private async finalizeRun() {
    if (!this.currentStatus) return;
    
    try {
        await prisma.scraperRun.update({
        where: { runId: this.currentStatus.runId },
        data: {
            status: this.currentStatus.status === 'running' ? 'RUNNING' : this.currentStatus.status === 'completed' ? 'COMPLETED' : 'FAILED',
            endTime: new Date(),
            productsFound: this.currentStatus.progress.productsFound,
            productsCreated: this.currentStatus.progress.productsCreated,
            lastProcessedPage: this.currentStatus.progress.lastProcessedPage || undefined,
        }
        });
    } catch (e) {
        console.error('Failed to finalize ScraperRun:', e);
    }
    
    this.addLog(`Run finalized. Status: ${this.currentStatus.status}`);
  }
}

export const orchestrator = BoothScraperOrchestrator.getInstance();
