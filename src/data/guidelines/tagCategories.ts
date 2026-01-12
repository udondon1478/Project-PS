import { TagCategoryInfo } from './types';

export const tagCategories: TagCategoryInfo[] = [
  {
    id: 'rating',
    name: 'レーティング',
    nameEn: 'Rating',
    color: '#E74C3C',
    description: '商品の年齢制限や内容の適切性を示します。最も重要なカテゴリです。',
    examples: ['全年齢', 'R-15', 'R-17', 'R-18'],
    priority: 1
  },
  {
    id: 'character',
    name: 'キャラクター',
    nameEn: 'Character',
    color: '#3498DB',
    description: '特定のキャラクター、アバター、種族などを表します。',
    examples: ['まめひなた', '桔梗', 'マヌカ', 'キプフェル'],
    priority: 2
  },
  {
    id: 'clothing',
    name: '衣服',
    nameEn: 'Clothing',
    color: '#9B59B6',
    description: '着用している衣装、アクセサリー、装備品などを表します。',
    examples: ['学生服', 'ピアス', 'ゴーグル', 'メイド服'],
    priority: 3
  },
  {
    id: 'body',
    name: '身体',
    nameEn: 'Body',
    color: '#E67E22',
    description: '身体的特徴、髪型、瞳の色、体の作りなどを表します。',
    examples: ['長髪', '青い瞳', '高身長', 'サイボーグ'],
    priority: 4
  },
  {
    id: 'scene',
    name: 'シーン',
    nameEn: 'Scene',
    color: '#1ABC9C',
    description: '背景、場所、環境、小道具などを表します。',
    examples: ['寝室', '海岸', '椅子', '夜'],
    priority: 5
  },
  {
    id: 'style',
    name: 'スタイル',
    nameEn: 'Style',
    color: '#F39C12',
    description: '商品全体のジャンル、スタイルなどを表します。',
    examples: ['サイバーパンク', 'レトロ', '清楚', '近未来'],
    priority: 6
  },
  {
    id: 'meta',
    name: 'メタ',
    nameEn: 'Meta',
    color: '#95A5A6',
    description: '商品自体の形式、ライセンス、利用規約、対応プラットフォームなどを表します。',
    examples: ['Unity_Package', 'FBX', 'クエスト対応', '商用利用可能'],
    priority: 7
  },
  {
    id: 'general',
    name: '一般',
    nameEn: 'General',
    color: '#34495E',
    description: '上記のどのカテゴリにも当てはまらない、一般的なタグです。大多数のタグはここに属します',
    examples: ['可愛い', 'クール', 'ネタアバター', '寿司'],
    priority: 8
  },
];
