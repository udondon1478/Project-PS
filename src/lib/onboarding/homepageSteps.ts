import type { StepType } from '@reactour/tour';

export const homepageSteps: StepType[] = [
  {
    selector: '[data-tour="search-input"]',
    content: 'ここに使用したいアバターや衣装のタグを入力します。スペースで区切ることで、複数のタグをAND検索できます。タグの前にハイフン(-)を付けると、そのタグを除外するマイナス検索ができます。',
  },
  {
    selector: '[data-tour="filter-button"]',
    content: 'ここから価格帯やカテゴリなどの詳細な条件で商品を絞り込めます。',
  },
];
