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
