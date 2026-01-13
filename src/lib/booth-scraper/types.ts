// Manually define Prisma types to avoid importing @prisma/client in client components
export type ScraperRunStatus = 'RUNNING' | 'COMPLETED' | 'STOPPING' | 'FAILED';

export interface ScraperRun {
  id: string;
  runId: string;
  startTime: Date;
  endTime: Date | null;
  status: ScraperRunStatus | string; // Allow string for flexibility
  productsFound: number;
  productsCreated: number;
  errors: string[];
  lastProcessedPage: number | null;
  metadata: any; // Using any for Json compatibility
  processedPages: number;
  failedUrls: string[];
  skipRequested: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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
    query?: string; // Keyword search (maps to q= parameter)
    tags?: string[]; // Tag filter (maps to tags[]= parameter)
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

export interface QueueItem {
  id: string; // Internal Queue ID
  mode: ScraperMode;
  userId: string;
  options: ScraperOptions;
  // Metadata for display
  targetName: string; // e.g. "VRChat" or "Global Scan"
  addedAt: Date;
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
