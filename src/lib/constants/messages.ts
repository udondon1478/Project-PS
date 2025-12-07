export const REPORT_ERROR_MESSAGES = {
  UNAUTHORIZED: 'ログインが必要です',
  ACCOUNT_SUSPENDED: 'アカウントが停止されています',
  VALIDATION_ERROR: '入力内容に誤りがあります',
  TOO_MANY_REPORTS: '短期間に多くの通報が行われました。しばらく待ってから再度お試しください。',
  OWN_PRODUCT: '自分の商品は通報できません',
  OWN_TAG: '自分が付けたタグは通報できません',
  INVALID_TARGET_TYPE: '無効な通報対象です',
  ALREADY_REPORTED: 'この対象は既に通報済みです',
  INTERNAL_SERVER_ERROR: 'サーバーエラーが発生しました',
} as const;
