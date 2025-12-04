export const REPORT_TARGET_TAG = 'TAG';
export const REPORT_TARGET_PRODUCT_TAG = 'PRODUCT_TAG';
export const REPORT_TARGET_PRODUCT = 'PRODUCT';

export type ReportTargetType = 
  | typeof REPORT_TARGET_TAG
  | typeof REPORT_TARGET_PRODUCT_TAG
  | typeof REPORT_TARGET_PRODUCT;
