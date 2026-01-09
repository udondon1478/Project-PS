import { TagCategoryInfo } from './types';

export const tagCategories: TagCategoryInfo[] = [
  {
    id: 'rating',
    name: 'レーティング',
    nameEn: 'Rating',
    color: '#E74C3C',
    description: '商品の年齢制限や内容の適切性を示します。最も重要なカテゴリです。',
    examples: ['rating:general', 'rating:sensitive', 'rating:questionable', 'rating:explicit'],
    priority: 1
  },
  {
    id: 'character',
    name: 'キャラクター',
    nameEn: 'Character',
    color: '#3498DB',
    description: '特定のキャラクター、アバター、種族などを表します。',
    examples: ['mamehinata', 'kikyo', 'original_character', 'elf'],
    priority: 2
  },
  {
    id: 'clothing',
    name: '衣服',
    nameEn: 'Clothing',
    color: '#9B59B6',
    description: '着用している衣装、アクセサリー、装備品などを表します。',
    examples: ['school_uniform', 'swimsuit', 'glasses', 'maid_costume'],
    priority: 3
  },
  {
    id: 'body',
    name: '身体',
    nameEn: 'Body',
    color: '#E67E22',
    description: '身体的特徴、髪型、瞳の色、ポーズなどを表します。',
    examples: ['long_hair', 'blue_eyes', 'sitting', 'large_breasts'],
    priority: 4
  },
  {
    id: 'scene',
    name: 'シーン',
    nameEn: 'Scene',
    color: '#1ABC9C',
    description: '背景、場所、環境、小道具などを表します。',
    examples: ['bedroom', 'beach', 'chair', 'night'],
    priority: 5
  },
  {
    id: 'style',
    name: 'スタイル',
    nameEn: 'Style',
    color: '#F39C12',
    description: 'アートスタイル、画材、表現技法などを表します。',
    examples: ['sketch', 'pixel_art', 'monochrome', 'photorealistic'],
    priority: 6
  },
  {
    id: 'meta',
    name: 'メタ',
    nameEn: 'Meta',
    color: '#95A5A6',
    description: '商品自体の形式、ライセンス、利用規約、対応プラットフォームなどを表します。',
    examples: ['unity_package', 'fbx', 'vrc_quest_compatible', 'commercial_use_allowed'],
    priority: 7
  },
  {
    id: 'general',
    name: '一般',
    nameEn: 'General',
    color: '#34495E',
    description: '上記のどのカテゴリにも当てはまらない、一般的なタグです。',
    examples: ['cute', 'cool', 'funny', 'text'],
    priority: 8
  },
];
