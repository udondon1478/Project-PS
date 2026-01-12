export const REPORT_TARGET_TAG = 'TAG';
export const REPORT_TARGET_PRODUCT_TAG = 'PRODUCT_TAG';
export const REPORT_TARGET_PRODUCT = 'PRODUCT';

export type ReportTargetType = 
  | typeof REPORT_TARGET_TAG
  | typeof REPORT_TARGET_PRODUCT_TAG
  | typeof REPORT_TARGET_PRODUCT;

export const REPORT_STATUS_PENDING = 'PENDING';
export const REPORT_STATUS_RESOLVED = 'RESOLVED';
export const REPORT_STATUS_IGNORED = 'IGNORED';

export const ReportStatus = {
  PENDING: REPORT_STATUS_PENDING,
  RESOLVED: REPORT_STATUS_RESOLVED,
  IGNORED: REPORT_STATUS_IGNORED,
} as const;

export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://polyseek.jp';

// Stale run recovery: Mark RUNNING records older than this as FAILED
export const STALE_RUN_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

// System User
export const SYSTEM_USER_EMAIL = 'system-scraper@polyseek.com';

// Scraper Configuration Defaults
export const SCRAPER_CONFIG_SINGLETON_ID = 'scraper-config-singleton';

export const DEFAULT_NEW_SCAN_INTERVAL_MIN = 10;
export const DEFAULT_NEW_SCAN_PAGE_LIMIT = 3;
export const DEFAULT_BACKFILL_INTERVAL_MIN = 5;
export const DEFAULT_BACKFILL_PAGES_PER_RUN = 3;
export const DEFAULT_BACKFILL_MAX_PRODUCTS = 9;
export const DEFAULT_REQUEST_INTERVAL_MS = 5000;

// Scraper Configuration Limits
export const MAX_INTERVAL_MIN = 10080; // One week in minutes
export const MAX_PAGE_LIMIT = 1000;
export const MAX_REQUEST_INTERVAL_MS = 60000;
