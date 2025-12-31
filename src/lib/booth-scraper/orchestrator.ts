import { prisma } from '@/lib/prisma';
import { Prisma, type ScraperRun } from '@prisma/client';
export type { ScraperRun };
import PQueue from 'p-queue';
import { ListingCrawler } from './listing-crawler';
import { checkExistingProducts } from './product-checker';
import { boothHttpClient } from './http-client';
import { parseProductPage, parseProductJson, type ProductPageResult } from './product-parser';
import { createProductFromScraper, ScrapedProductData } from './product-creator';
import { waitJitter } from './utils';
import crypto from 'crypto';


/**
 * Maximum number of products to process in a single backfill run.
 * This limit prevents overwhelming the system during extensive backfill operations.
 * Defaults to 9 products per run to keep batches small and manageable.
 */
const BACKFILL_PRODUCT_LIMIT = Number(process.env.BACKFILL_PRODUCT_LIMIT) || 9;

/**
 * Delay in milliseconds between processing queue items.
 * Can be configured via TASK_WAIT_MS environment variable.
 * Default: 2000ms
 */
const TASK_WAIT_MS = Number(process.env.TASK_WAIT_MS) || 2000;

export type ScraperMode = 'NEW' | 'BACKFILL';

export interface ScraperOptions {
  pageLimit?: number;
  pagesPerRun?: number; // BACKFILL: Number of pages to go back in one run
  maxProducts?: number; // BACKFILL: Max products to process
  requestInterval?: number; // Base interval between requests in ms
  rateLimitOverride?: number; // Deprecated: alias for requestInterval
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
  searchParams?: {
    query?: string;
    category?: string;
    adult?: boolean;
    useTargetTags?: boolean;
  };
}

export interface ScraperLog {
  id: string;
  timestamp: string;
  message: string;
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
  logs: ScraperLog[];
  // Added for queue visibility
  queue: QueueItem[];
  currentTarget: QueueItem | null;
}

export interface QueueItem {
  id: string; // Internal Queue ID
  mode: ScraperMode;
  userId: string;
  options: ScraperOptions;
  // Metadata for display
  targetName: string; // e.g. "VRChat" or "Global Scan"
  addedAt: Date;
}


const STATUS_MAP = {
  running: 'RUNNING',
  completed: 'COMPLETED',
  failed: 'FAILED',
  stopping: 'FAILED',
} as const;

class BoothScraperOrchestrator {
  private static instance: BoothScraperOrchestrator;
  
  // Current Active Run State
  private currentStatus: ScraperStatus | null = null;
  private queue: PQueue | null = null; // Internal crawler queue for ONE run
  private shouldStop = false;

  // Global Queue State
  private targetQueue: QueueItem[] = [];
  private isProcessingQueue = false;

  private constructor() {}

  public static getInstance(): BoothScraperOrchestrator {
    if (!BoothScraperOrchestrator.instance) {
      BoothScraperOrchestrator.instance = new BoothScraperOrchestrator();
    }
    return BoothScraperOrchestrator.instance;
  }

  public getStatus(): ScraperStatus | null {
    // Return current status enriched with queue info
    const baseStatus = this.currentStatus ? { ...this.currentStatus } : null;
    return {
      ...(baseStatus || {
        runId: '',
        mode: 'NEW',
        status: 'completed',
        progress: { pagesProcessed:0, productsFound:0, productsExisting:0, productsCreated:0, productsSkipped:0, productsFailed:0, lastProcessedPage:0 },
        timings: { startTime: 0, averageDelay: 0 },
        logs: [],
        currentTarget: null,
      }),
      queue: [...this.targetQueue],
      currentTarget: this.currentStatus?.currentTarget || null,
    };
  }

  /**
   * Skips the currently running item if any.
   * Unlike stop(), this keeps the queue alive and proceeds to next item.
   */
  public async skipCurrent() {
    if (this.currentStatus && this.currentStatus.status === 'running') {
      this.addLog('Skipping current task requested...');
      this.shouldStop = true;
      this.currentStatus.status = 'stopping';
      if (this.queue) {
        this.queue.pause();
        this.queue.clear();
      }
    }
  }

  /**
   * Legacy stop - Stops everything including queue processing?
   * For backward compatibility, let's make it clear queue as well.
   */
  public async stopAll() {
    this.targetQueue = []; // Clear pending
    await this.skipCurrent(); // Stop current
  }

  public removeFromQueue(queueId: string) {
    this.targetQueue = this.targetQueue.filter(item => item.id !== queueId);
  }

  /**
   * Enqueues tasks. Returns number of tasks enqueued.
   */
  public async start(mode: ScraperMode, userId: string, options: ScraperOptions = {}): Promise<string> {
    const itemsToEnqueue: QueueItem[] = [];

    // Expand "Global" run into individual tag tasks
    if (options.searchParams?.useTargetTags) {
       const dbTags = await prisma.scraperTargetTag.findMany({
         where: { enabled: true }
       });
       
       if (dbTags.length > 0) {
         for (const tag of dbTags) {
           // Clone options for this specific tag
           const tagOptions: ScraperOptions = {
             ...options,
             searchParams: {
               ...options.searchParams,
               query: tag.tag,
               category: tag.category || undefined,
               useTargetTags: false // It's now a specific target
             }
           };

           // Backfill specific offset
           if (mode === 'BACKFILL') {
             // We'll read the latest offset inside processQueue -> runWorkflow
             // but we can pass tag metadata here if needed.
             // Actually runWorkflow handles fetching the offset based on query match.
           }

           itemsToEnqueue.push({
             id: crypto.randomUUID(),
             mode,
             userId,
             options: tagOptions,
             targetName: tag.tag,
             addedAt: new Date()
           });
         }
       }
    } else {
       // Single Manual Run
       itemsToEnqueue.push({
         id: crypto.randomUUID(),
         mode,
         userId,
         options,
         targetName: options.searchParams?.query || 'Manual Run',
         addedAt: new Date()
       });
    }

    this.targetQueue.push(...itemsToEnqueue);
    console.log(`[Orchestrator] Enqueued ${itemsToEnqueue.length} tasks.`);
    
    // Trigger processing if not active
    if (!this.isProcessingQueue) {
      this.processQueue();
    }

    return itemsToEnqueue.length > 0 ? itemsToEnqueue[0].id : '';
  }

  private async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.targetQueue.length > 0) {
      const item = this.targetQueue.shift();
      if (!item) break;

      try {
        console.log(`[Orchestrator] Starting task: ${item.targetName} (${item.mode})`);
        await this.runItem(item);
      } catch (e) {
        console.error(`[Orchestrator] Error executing task ${item.targetName}:`, e);
      }

      // Configurable delay between tasks (default: 2000ms)
      await new Promise(resolve => setTimeout(resolve, TASK_WAIT_MS));
    }

    this.isProcessingQueue = false;
    console.log('[Orchestrator] Queue drained.');
  }

  private async runItem(item: QueueItem): Promise<void> {
    // Reset state for new run
    this.shouldStop = false;
    
    // Generate RunID for DB
    const runId = `run_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const startTime = Date.now();

    // Initialize Status
    this.currentStatus = {
      runId,
      mode: item.mode,
      status: 'running',
      progress: {
        pagesProcessed: 0,
        productsFound: 0,
        productsExisting: 0,
        productsCreated: 0,
        productsSkipped: 0,
        productsFailed: 0,
        lastProcessedPage: 0,
      },
      timings: {
        startTime,
        averageDelay: 0,
      },
      logs: [],
      queue: this.targetQueue, // Reference
      currentTarget: item,
    };

    // Create DB Record
    await prisma.scraperRun.create({
      data: {
        runId,
        status: 'RUNNING',
        startTime: new Date(startTime),
        metadata: { mode: item.mode, target: item.targetName } as unknown as Prisma.JsonObject,
      },
    });

    this.addLog(`Starting task for: ${item.targetName} (Mode: ${item.mode})`);

    try {
      await this.runWorkflow(item.mode, item.userId, item.options, item.targetName);
    } catch (err) {
      console.error('Workflow Error:', err);
      this.addLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
      if (this.currentStatus) this.currentStatus.status = 'failed';
    } finally {
      await this.finalizeRun();
      this.currentStatus = null; // Clear status after run
    }
  }

  private async runWorkflow(mode: ScraperMode, userId: string, options: ScraperOptions, targetName: string) {
    const isBackfill = mode === 'BACKFILL';
    
    const defaultBaseInterval = 5000;
    const targetInterval = options.requestInterval ?? options.rateLimitOverride ?? defaultBaseInterval;
    
    this.queue = new PQueue({
      concurrency: 1,
      interval: 1000,
      intervalCap: 1,
    });

    let startPage = 1;
    let maxPages = 3;
    const limitMaxProducts = options.maxProducts ?? BACKFILL_PRODUCT_LIMIT;

    // Determine Tag ID if exists to fetch resume point
    let tagId: string | undefined;
    if (isBackfill) {
        // Try to find the tag in DB to resume
        const tag = await prisma.scraperTargetTag.findFirst({
            where: { tag: options.searchParams?.query }
        });
        
        if (tag) {
            tagId = tag.id;
            startPage = (tag.lastBackfillPage || 0) + 1;
        } else {
             // Fallback to global resume if needed, or start from 1
             startPage = 1; 
        }

        const pagesPerRun = options.pagesPerRun ?? 3; 
        maxPages = startPage + pagesPerRun - 1;
        
        if (options.pageLimit) {
             maxPages = startPage + options.pageLimit - 1;
        }
    } else {
         // NEW Mode
         if (options.pageLimit) {
             maxPages = options.pageLimit;
         }
    }

    this.addLog(`Target: ${targetName}, Pages: ${startPage}-${maxPages}`);

    const crawler = new ListingCrawler({
      queue: this.queue!,
      searchParams: options.searchParams,
    });

    await crawler.run({
      startPage: startPage,
      maxPages: maxPages - startPage + 1,
      onProductsFound: async (urls, page) => {
        const continued = await this.processBatch(urls, page, userId, isBackfill, targetInterval);
        await this.updateDbProgress();
        
        // Only update progress if we completed the page (didn't stop mid-way)
        if (continued && isBackfill && tagId) {
            await this.updateTagProgress(tagId, page);
        }
        
        await this.checkRemoteStopSignal();
        
        return continued; // Signal to crawler whether to continue
      }
    });

    if (this.currentStatus?.status !== 'failed' && this.currentStatus?.status !== 'stopping') {
      this.currentStatus!.status = 'completed';
    }
  }

  // --- Helpers same as before ---

  private async checkRemoteStopSignal() {
    if (!this.currentStatus || this.shouldStop) return;

    try {
      const run = await prisma.scraperRun.findUnique({
        where: { runId: this.currentStatus.runId },
        select: { status: true }
      });

      if ((run?.status as string) === 'STOPPING') {
        this.addLog('Received remote stop signal.');
        this.shouldStop = true; // Use local flag
        this.currentStatus.status = 'stopping';
        if (this.queue) {
            this.queue.clear();
        }
      }
    } catch (e) {
      console.error('Failed to check remote stop signal:', e);
    }
  }

  private async processBatch(urls: string[], page: number, userId: string, isBackfill: boolean, baseInterval: number): Promise<boolean> {
    if (!this.currentStatus) return false;
    
    this.currentStatus.progress.lastProcessedPage = page;
    this.currentStatus.progress.pagesProcessed++;
    this.addLog(`Page ${page}: ${urls.length} products found`);
    this.currentStatus.progress.productsFound += urls.length;

    let existingSet = new Set<string>();
    try {
        existingSet = await checkExistingProducts(urls);
    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        const failureAction = this.currentStatus?.currentTarget?.options.onExistenceCheckFailure ?? 'continue';
        if (failureAction === 'stop') {
            this.addLog(`Existence check failed, stopping: ${errorMsg}`);
            this.currentStatus.progress.productsFailed += urls.length;
            return false;
        }
        this.addLog(`Existence check failed, continuing: ${errorMsg}`);
    }

    const newUrls = urls.filter(u => !existingSet.has(u));
    const skippedCount = urls.length - newUrls.length;
    this.currentStatus.progress.productsExisting += skippedCount;

    if (skippedCount > 0) {
      this.addLog(`Skipped ${skippedCount} existing products.`);
    }
    
    for (const url of newUrls) {
       if (this.shouldStop) return false;

       if (isBackfill) {
         const processedCount = this.currentStatus.progress.productsCreated + this.currentStatus.progress.productsSkipped + this.currentStatus.progress.productsFailed;
         // Note: We use the limit passed via options or constant
         const limit = this.currentStatus.currentTarget?.options.maxProducts ?? BACKFILL_PRODUCT_LIMIT;
         
         if (processedCount >= limit) {
           this.addLog(`Limit of ${limit} reached.`);
           this.shouldStop = true;
           return false;
         }
       }

       await this.queue!.add(async () => {
         try {
            await waitJitter(baseInterval, 2000);

           let data: ProductPageResult | null = null;
           try {
             const jsonRes = await boothHttpClient.fetch(url + '.json');
             if (jsonRes.ok) {
                const jsonData = await jsonRes.json();
                data = parseProductJson(jsonData, url);
             }
           } catch (e) {}

           if (!data) {
                const res = await boothHttpClient.fetch(url);
                if (!res.ok) {
                    this.currentStatus!.progress.productsFailed++;
                    return;
                }
                const html = await res.text();
                data = parseProductPage(html, url);
           }
           
           if (data) {
             const productData: ScrapedProductData = { ...data, boothJpUrl: url };
             await createProductFromScraper(productData, userId);
             this.currentStatus!.progress.productsCreated++;
           } else {
             this.currentStatus!.progress.productsFailed++;
           }

          } catch (error: unknown) {
            this.currentStatus!.progress.productsFailed++;
            // Simplify log
          }
       });
    }
    
    return true;
  }

  private addLog(msg: string) {
    const ts = new Date().toISOString();
    if (this.currentStatus) {
      this.currentStatus.logs.push({
        id: crypto.randomUUID(),
        timestamp: ts,
        message: msg
      });
      if (this.currentStatus.logs.length > 100) this.currentStatus.logs.shift();

      prisma.scraperLog.create({
        data: {
          runId: this.currentStatus.runId,
          message: msg,
          createdAt: new Date()
        }
      }).catch(() => {});
    }
    console.log(`[Orchestrator] [${ts}] ${msg}`);
  }

  private async updateDbProgress() {
    if (!this.currentStatus) return;
    try {
      await prisma.scraperRun.update({
        where: { runId: this.currentStatus.runId },
        data: {
          productsCreated: this.currentStatus.progress.productsCreated,
          processedPages: this.currentStatus.progress.pagesProcessed,
          productsFound: this.currentStatus.progress.productsFound,
          lastProcessedPage: this.currentStatus.progress.lastProcessedPage ?? undefined,
        }
      });
    } catch (err) {
      console.error('Failed to update DB progress in orchestrator', err);
    }
  }

  private async updateTagProgress(tagId: string, page: number) {
    try {
        await prisma.scraperTargetTag.update({
            where: { id: tagId },
            data: { lastBackfillPage: page }
        });
    } catch (err) {
      console.error('Failed to update tag progress in orchestrator', err);
    }
  }

  private async finalizeRun() {
    if (!this.currentStatus) return;
    try {
        await prisma.scraperRun.update({
        where: { runId: this.currentStatus.runId },
        data: {
            status: STATUS_MAP[this.currentStatus.status] ?? 'FAILED',
            endTime: new Date(),
            productsFound: this.currentStatus.progress.productsFound,
            productsCreated: this.currentStatus.progress.productsCreated,
            lastProcessedPage: this.currentStatus.progress.lastProcessedPage ?? undefined,
        }
        });
    } catch (err) {
      console.error('Failed to finalize run in orchestrator', err);
    }
    this.addLog(`Run finalized.`);
  }
}

export const orchestrator = BoothScraperOrchestrator.getInstance();
