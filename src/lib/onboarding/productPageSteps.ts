import type { StepType } from '@reactour/tour';

export const productPageSteps: StepType[] = [
  {
    selector: '[data-tour="like-button"]',
    content: 'ハートアイコンを押すと、この商品を「欲しいものリスト」に保存できます。リストはプロフィールページから確認できます。',
  },
  {
    selector: '[data-tour="own-button"]',
    content: 'チェックアイコンを押すと、この商品を「所有済みリスト」に記録できます。こちらもプロフィールページから確認できます。',
  },
  {
    selector: '[data-tour="tags-list"]',
    content: 'ここには商品に関連するタグが表示されます。各タグの右にあるボタンで、タグを検索条件に追加したり、除外したりできます。',
  },
  {
    selector: '[data-tour="edit-tags-button"]',
    content: '「編集」ボタンから、この商品のタグを自由に追加・削除できます。あなたの知識で情報を充実させましょう。',
  },
  {
    selector: '[data-tour="tag-history-button"]',
    content: '他のユーザーがどのようにタグを編集したか、その履歴を確認できます。良い編集には「いいね」で評価もできます。',
  },
];
