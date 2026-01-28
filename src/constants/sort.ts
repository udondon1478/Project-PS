/**
 * 商品検索のソート順の定義
 */
export const SORT_VALUES = ['newest', 'oldest', 'published-new', 'published-old', 'price-low', 'price-high'] as const;

export type SortOption = typeof SORT_VALUES[number];

export function isSortOption(value: unknown): value is SortOption {
  return (SORT_VALUES as readonly unknown[]).includes(value);
}
