import { OnboardingStep } from '@/components/onboarding/OnboardingTour';

export const searchTourSteps: OnboardingStep[] = [
  {
    selector: 'input[placeholder="タグで検索 (-でマイナス検索)"]',
    title: 'ようこそ！',
    content: 'まずはサイトの基本的な使い方をご紹介します。ここではキーワードで商品を検索できます。複数の単語を入力するとAND検索になります。',
    side: 'bottom',
  },
  {
    selector: '#filter-menu-trigger',
    title: '絞り込み検索',
    content: 'フィルターを使えば、タグ、価格、評価などで検索結果を細かく絞り込めます。',
    side: 'bottom',
  },
  {
    selector: '[data-testid="product-card-like-button"]',
    title: '「欲しいもの」リスト',
    content: '気になる商品を見つけたらハートを押してみましょう。「欲しいもの」リストに登録され、後からいつでも確認できます。',
    side: 'bottom',
  },
  {
    selector: '[data-testid="product-card-own-button"]',
    title: '「所有済み」リスト',
    content: 'このアイコンは「所有済み」を記録します。自分が持っている商品を管理するのに便利です。',
    side: 'bottom',
  },
];

export const productDetailTourSteps: OnboardingStep[] = [
  {
    selector: '#product-tags-container',
    title: 'タグリスト',
    content: 'ここでは商品に関連するタグが表示されます。タグをクリックすると、そのタグが追加されて同じタグを持つ商品一覧に移動します。',
    side: 'left',
  },
  {
    selector: '[data-testid="tag-negative-search-button"]',
    title: 'マイナス検索',
    content: 'タグの横にあるこのボタンを押すと、そのタグを除外して商品を検索できます（マイナス検索）。',
    side: 'left',
  },
  {
    selector: '#edit-tags-button',
    title: 'タグの編集',
    content: 'タグの追加や修正はここから行えます。あなたの知識で商品をより見つけやすくしましょう。',
    side: 'left',
  },
  {
    selector: '#view-tag-history-button',
    title: '編集履歴の評価',
    content: '過去のタグ編集履歴を確認し、その編集が良いものだったか評価を投稿できます。',
    side: 'left',
  },
];

export const boothRegistrationTourSteps: OnboardingStep[] = [
  {
    selector: '#boothUrl',
    title: 'BOOTH商品登録',
    content: 'BOOTHの商品を登録するには、まずここに商品のURLを貼り付けてください。',
    side: 'bottom',
  },
  {
    selector: '#fetch-product-info-button',
    title: '情報取得',
    content: 'URLを入力したら、このボタンを押して次に進みます。',
    side: 'bottom',
  },
  {
    selector: '#ageRating',
    title: '対象年齢の設定',
    content: '次に、商品の対象年齢を設定してください。',
    side: 'top',
  },
  {
    selector: '#manualTags',
    title: 'タグ付け',
    content: '最後に、商品を的確に表すタグを付けて登録を完了しましょう。',
    side: 'top',
  },
];
