import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import PQueue from 'p-queue';
import { ListingCrawler } from './listing-crawler';
import { checkExistingProducts } from './product-checker';
import { boothHttpClient } from './http-client';
import { parseProductPage, parseProductJson, type ProductPageResult } from './product-parser';
import { createProductFromScraper, ScrapedProductData } from './product-creator';
import { waitJitter } from './utils';
import crypto from 'crypto';
import type { ScraperRun, ScraperMode, ScraperOptions, ScraperLog, ScraperStatus, QueueItem } from './types';
import { createAITagger } from './ai-tagger';
import { TagResolver } from './tag-resolver';

// Re-export types for backward compatibility (if needed) but prefer importing from types.ts directly
export type { ScraperRun, ScraperMode, ScraperOptions, ScraperLog, ScraperStatus, QueueItem };



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

/**
 * Maximum number of items allowed in the target queue.
 * Prevents memory issues from unbounded queue growth.
 * Default: 100 items
 */
const MAX_QUEUE_SIZE = Number(process.env.MAX_QUEUE_SIZE) || 100;

const STATUS_MAP = {
  running: 'RUNNING',
  completed: 'COMPLETED',
  failed: 'FAILED',
  stopping: 'STOPPING',
} as const;

/**
 * Default scraper status used when no active run exists.
 */
const DEFAULT_SCRAPER_STATUS: Omit<ScraperStatus, 'queue' | 'currentTarget'> = {
  runId: '',
  mode: 'NEW',
  status: 'completed',
  progress: {
    pagesProcessed: 0,
    productsFound: 0,
    productsExisting: 0,
    productsCreated: 0,
    productsSkipped: 0,
    productsFailed: 0,
    lastProcessedPage: 0,
  },
  timings: { startTime: 0, averageDelay: 0 },
  logs: [],
};

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
      ...(baseStatus || DEFAULT_SCRAPER_STATUS),
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
               tags: [tag.tag], // Use tags[] parameter for exact tag matching
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

    // Check queue size limit before adding
    if (this.targetQueue.length + itemsToEnqueue.length > MAX_QUEUE_SIZE) {
      const available = MAX_QUEUE_SIZE - this.targetQueue.length;
      if (available <= 0) {
        console.warn(`[Orchestrator] Queue full (${MAX_QUEUE_SIZE} items). Rejecting new tasks.`);
        throw new Error(`Queue is full. Maximum ${MAX_QUEUE_SIZE} items allowed.`);
      }
      console.warn(`[Orchestrator] Queue limit reached. Only adding ${available} of ${itemsToEnqueue.length} tasks.`);
      itemsToEnqueue.splice(available);
    }

    this.targetQueue.push(...itemsToEnqueue);
    console.log(`[Orchestrator] Enqueued ${itemsToEnqueue.length} tasks. Queue size: ${this.targetQueue.length}/${MAX_QUEUE_SIZE}`);
    
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

    // キュー処理完了後、AIバックフィルを実行
    try {
      await this.runAIBackfill();
    } catch (e) {
      console.error('[Orchestrator] AI backfill error:', e);
    }
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
        // BACKFILL mode requires tags to resume from last position.
        // Tags are typically set by useTargetTags expansion, but direct API calls
        // may not provide tags. Without tags, we cannot track resume position
        // per-tag, so we start from page 1 (no resume capability).
        const searchTag = options.searchParams?.tags?.[0];

        if (!searchTag) {
            // No tag provided - BACKFILL will start from page 1 without resume capability.
            // This is valid for manual/test runs but resume tracking won't work.
            this.addLog('BACKFILL: No tag provided, starting from page 1 (resume disabled)');
            startPage = 1;
        } else {
            // Try to find the tag in DB to resume (include category for composite key)
            const tag = await prisma.scraperTargetTag.findFirst({
                where: {
                  tag: searchTag,
                  category: options.searchParams?.category,
                }
            });

            if (tag) {
                tagId = tag.id;
                startPage = (tag.lastBackfillPage || 0) + 1;
            } else {
                // Tag provided but not found in DB - start from page 1
                // This happens when scraping a new tag not yet registered
                startPage = 1;
            }
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

        return continued && !this.shouldStop; // Signal to crawler whether to continue
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
        select: { status: true, skipRequested: true }
      });

      // Check for STOPPING status (existing logic)
      if ((run?.status as string) === 'STOPPING') {
        this.addLog('Received remote stop signal.');
        this.shouldStop = true;
        this.currentStatus.status = 'stopping';
        if (this.queue) {
            this.queue.clear();
        }
      }

      // Check for skipRequested flag (new logic for dashboard skip button)
      if (run?.skipRequested) {
        this.addLog('Skip requested from dashboard. Stopping task...');
        this.shouldStop = true;
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

  /**
   * AIバックフィル: 日次予算の残りで既存商品をAI分析
   * スクレイピングキュー処理後に呼び出される
   */
  public async runAIBackfill(): Promise<{ processed: number; tagged: number }> {
    const config = await prisma.scraperConfig.findFirst();
    if (!config?.enableAITagging || !config.aiBackfillEnabled) {
      return { processed: 0, tagged: 0 };
    }

    // 日次コストリセットチェック
    const now = new Date();
    let todayCost = config.aiTodayCostYen;
    if (config.aiCostResetAt && config.aiCostResetAt < now) {
      await prisma.scraperConfig.update({
        where: { id: config.id },
        data: { aiTodayCostYen: 0, aiCostResetAt: getNextMidnightJST() },
      });
      todayCost = 0;
    }

    const remainingBudget = config.aiDailyCostLimitYen - todayCost;
    if (remainingBudget <= 0) {
      console.log('[AIBackfill] No remaining budget for today');
      return { processed: 0, tagged: 0 };
    }

    // AI未分析の商品を古い順に取得
    const estimatedCostPerProduct = 0.8; // ¥0.7-1.0の中間値
    const maxProducts = Math.floor(remainingBudget / estimatedCostPerProduct);
    if (maxProducts <= 0) return { processed: 0, tagged: 0 };

    const products = await prisma.product.findMany({
      where: {
        productTags: { none: { source: 'ai' } },
      },
      orderBy: { createdAt: 'asc' },
      take: Math.min(maxProducts, 50), // 一度に最大50商品
      include: {
        images: { orderBy: { order: 'asc' }, take: config.aiMaxImagesPerProduct },
      },
    });

    if (products.length === 0) {
      console.log('[AIBackfill] No products without AI tags found');
      return { processed: 0, tagged: 0 };
    }

    console.log(`[AIBackfill] Processing ${products.length} products (budget: ¥${remainingBudget.toFixed(1)})`);

    const aiTagger = createAITagger(
      config.aiProvider,
      config.aiModel,
      config.aiMaxImagesPerProduct,
      config.aiMaxImageSize,
    );
    const tagResolver = new TagResolver(prisma);

    let processed = 0;
    let tagged = 0;

    for (const product of products) {
      // 予算チェック（最新のコスト情報を取得）
      const latestConfig = await prisma.scraperConfig.findFirst({
        select: { aiTodayCostYen: true, aiDailyCostLimitYen: true },
      });
      if (latestConfig && latestConfig.aiTodayCostYen >= latestConfig.aiDailyCostLimitYen) {
        console.log('[AIBackfill] Daily budget exhausted');
        break;
      }

      try {
        const aiResult = await aiTagger.analyzeProduct({
          title: product.title,
          description: product.description || '',
          imageUrls: product.images.map((img) => img.imageUrl),
          ageRating: null,
        });

        // コスト記録
        await prisma.scraperConfig.update({
          where: { id: config.id },
          data: { aiTodayCostYen: { increment: aiResult.estimatedCostYen } },
        });

        // タグ保存
        const confidenceThreshold = config.aiConfidenceThreshold;
        for (const suggestion of aiResult.tags) {
          if (suggestion.confidence < confidenceThreshold) continue;
          try {
            const resolvedTagId = await tagResolver.resolveTagWithCategory(
              suggestion.name,
              suggestion.category,
            );
            await prisma.productTag.upsert({
              where: {
                productId_tagId_source_isOfficial: {
                  productId: product.id,
                  tagId: resolvedTagId,
                  source: 'ai',
                  isOfficial: false,
                },
              },
              create: {
                productId: product.id,
                tagId: resolvedTagId,
                source: 'ai',
                confidence: suggestion.confidence,
                isOfficial: false,
              },
              update: { confidence: suggestion.confidence },
            });
            tagged++;
          } catch (e) {
            // 重複はスキップ
          }
        }

        // 美学カテゴリ
        if (aiResult.aestheticCategory) {
          try {
            const aestheticTagId = await tagResolver.resolveTagWithCategory(
              aiResult.aestheticCategory,
              'aesthetic',
            );
            await prisma.productTag.upsert({
              where: {
                productId_tagId_source_isOfficial: {
                  productId: product.id,
                  tagId: aestheticTagId,
                  source: 'ai',
                  isOfficial: false,
                },
              },
              create: {
                productId: product.id,
                tagId: aestheticTagId,
                source: 'ai',
                confidence: 1.0,
                isOfficial: false,
              },
              update: {},
            });
            tagged++;
          } catch (e) {
            // スキップ
          }
        }

        processed++;
        console.log(`[AIBackfill] Processed ${product.id}: ${aiResult.tags.length} tags, ¥${aiResult.estimatedCostYen}`);
      } catch (error) {
        console.error(`[AIBackfill] Failed to process product ${product.id}:`, error);
      }
    }

    console.log(`[AIBackfill] Complete: ${processed} processed, ${tagged} tags added`);
    return { processed, tagged };
  }
}

/** 次の日本時間0:00 (UTC 15:00) を取得 */
function getNextMidnightJST(): Date {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstNow = new Date(now.getTime() + jstOffset);
  const jstMidnight = new Date(jstNow);
  jstMidnight.setUTCHours(0, 0, 0, 0);
  if (jstMidnight <= jstNow) {
    jstMidnight.setUTCDate(jstMidnight.getUTCDate() + 1);
  }
  return new Date(jstMidnight.getTime() - jstOffset);
}

export const orchestrator = BoothScraperOrchestrator.getInstance();
