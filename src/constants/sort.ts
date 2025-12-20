/**
 * 商品検索のソート順の定義
 */
export const SORT_VALUES = ['newest', 'price-low', 'price-high'] as const;

export type SortOption = typeof SORT_VALUES[number];
