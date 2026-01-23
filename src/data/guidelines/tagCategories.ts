import { TagCategoryInfo } from './types';

/**
 * VRChat/メタバース向けに最適化された10カテゴリのタグ分類
 * 実際の使用タグ分析に基づき、商品種別カテゴリを追加
 */
export const tagCategories: TagCategoryInfo[] = [
  {
    id: 'rating',
    name: 'レーティング',
    nameEn: 'Rating',
    color: '#E74C3C',
    description: '商品の年齢制限を示します。最も重要なカテゴリです。',
    examples: ['全年齢', 'R-15', 'R-17', 'R-18'],
    priority: 1
  },
  {
    id: 'avatar',
    name: 'アバター',
    nameEn: 'Avatar',
    color: '#3498DB',
    description: 'VRChatアバターやキャラクター名を表します。',
    examples: ['しなの', 'マヌカ', 'ミルティナ', 'ルルネ', 'ショコラ', 'キプフェル'],
    priority: 2
  },
  {
    id: 'body',
    name: '身体',
    nameEn: 'Body',
    color: '#E67E22',
    description: '体型・髪型・瞳・耳・尻尾などの身体的特徴を表します。',
    examples: ['長髪', '青い瞳', 'ケモミミ', '狐耳', 'ツインテール', '髪型'],
    priority: 3
  },
  {
    id: 'outfit',
    name: '衣装',
    nameEn: 'Outfit',
    color: '#9B59B6',
    description: '衣服・アクセサリー・装飾品などを表します。',
    examples: ['学生服', 'メイド服', '水着', 'イヤリング・ピアス', 'パーカー'],
    priority: 4
  },
  {
    id: 'style',
    name: 'スタイル',
    nameEn: 'Style',
    color: '#F39C12',
    description: 'アートスタイルやジャンルを表します。',
    examples: ['アニメ調', 'ケモノ', 'リアル', 'ファンタジー', 'サイバーパンク'],
    priority: 5
  },
  {
    id: 'platform',
    name: 'プラットフォーム',
    nameEn: 'Platform',
    color: '#1ABC9C',
    description: '対応環境・プラットフォームを表します。購入判断に重要です。',
    examples: ['VRChat', 'Quest対応', 'PC専用', 'VRM', 'VRoid'],
    priority: 6
  },
  {
    id: 'feature',
    name: '機能',
    nameEn: 'Feature',
    color: '#27AE60',
    description: 'VRChat機能やカスタマイズ性、対応アバターを表します。',
    examples: ['PhysBones', 'MA対応', 'マヌカ対応', '着せ替え可能', 'フェイストラッキング'],
    priority: 7
  },
  {
    id: 'product_type',
    name: '商品種別',
    nameEn: 'Product Type',
    color: '#8E44AD',
    description: '商品の種類を表します。3Dモデル、アニメーション、テクスチャなど。',
    examples: ['3Dモデル', 'アニメーション', 'テクスチャ', '小道具', 'ギミック', 'ポーズ集'],
    priority: 8
  },
  {
    id: 'technical',
    name: '技術仕様',
    nameEn: 'Technical',
    color: '#95A5A6',
    description: 'ファイル形式・シェーダー・性能・Unityバージョンなどの技術情報を表します。',
    examples: ['FBX', 'lilToon', 'Poiyomi', 'Unity', 'Blender', 'UnityPackage'],
    priority: 9
  },
  {
    id: 'general',
    name: '一般',
    nameEn: 'General',
    color: '#34495E',
    description: '上記のどのカテゴリにも当てはまらない一般的なタグです。',
    examples: ['かわいい', 'クール', 'ネタ', '無料', 'おすすめ'],
    priority: 10
  },
];

/**
 * 旧カテゴリから新カテゴリへのマッピング
 * マイグレーション時に使用
 */
export const legacyCategoryMapping: Record<string, string> = {
  // 変更なし
  rating: 'rating',
  body: 'body',
  style: 'style',
  general: 'general',
  // 名称変更
  character: 'avatar',
  clothing: 'outfit',
  // 統合・分割
  scene: 'general',
  meta: 'technical',
  // 旧カテゴリ
  product_category: 'product_type',
  other: 'general',
  age_rating: 'rating',
  feature: 'feature',
};
