/**
 * Auto-tagging rules for product analysis
 * Each rule contains keywords and corresponding tags to apply
 */

export interface AutoTagRule {
  keywords: string[];
  tags: string[];
}

export const AUTO_TAG_RULES: AutoTagRule[] = [
  // Clothing and Fashion
  {
    keywords: ['衣装', '服', 'アウター', 'トップス', 'ボトムス', 'ワンピース', 'スカート', 'パンツ', 'ジャケット', 'コート'],
    tags: ['衣装']
  },
  {
    keywords: ['靴', 'シューズ', 'ブーツ', 'スニーカー', 'サンダル', 'パンプス'],
    tags: ['靴']
  },
  {
    keywords: ['アクセサリー', 'ピアス', 'イヤリング', 'ネックレス', '指輪', 'リング', 'ブレスレット', '髪飾り', 'ヘアアクセ'],
    tags: ['アクセサリー']
  },

  // Hair and Body
  {
    keywords: ['髪型', 'ヘアスタイル', 'ヘア', '髪', 'ロング', 'ショート', 'ツインテール', 'ポニーテール'],
    tags: ['髪型']
  },
  {
    keywords: ['肌', 'スキン', 'テクスチャ', 'ボディ'],
    tags: ['肌']
  },

  // Items and Props
  {
    keywords: ['武器', '剣', '銃', 'ナイフ', 'ソード', '刀'],
    tags: ['武器']
  },
  {
    keywords: ['小物', '雑貨', 'プロップ', '道具'],
    tags: ['小物']
  },
  {
    keywords: ['家具', 'インテリア', '椅子', 'テーブル', 'ベッド', 'ソファ'],
    tags: ['家具']
  },

  // Animations and Expressions
  {
    keywords: ['アニメーション', 'モーション', 'エモート', 'ダンス', 'ジェスチャー'],
    tags: ['アニメーション']
  },
  {
    keywords: ['表情', 'エクスプレッション', '顔'],
    tags: ['表情']
  },

  // Shaders and Effects
  {
    keywords: ['シェーダー', 'shader', 'マテリアル', 'material'],
    tags: ['シェーダー']
  },
  {
    keywords: ['エフェクト', 'effect', 'パーティクル', 'particle', 'VFX'],
    tags: ['エフェクト']
  },

  // World and Environments
  {
    keywords: ['ワールド', 'world', 'マップ', 'ステージ', '背景', 'ギミック'],
    tags: ['ワールド']
  },

  // Gimmicks and Systems
  {
    keywords: ['ギミック', 'システム', 'スクリプト', 'プレハブ', 'prefab'],
    tags: ['ギミック']
  },

  // Tools and Utilities
  {
    keywords: ['ツール', 'tool', 'エディタ拡張', 'unity拡張', 'blender'],
    tags: ['ツール']
  },

  // Texture and Materials
  {
    keywords: ['テクスチャ', 'texture', 'uv', 'マテリアル', 'pbr'],
    tags: ['テクスチャ']
  },

  // Model Types
  {
    keywords: ['3dモデル', 'fbx', 'obj', 'vrmファイル', '.vrm'],
    tags: ['3Dモデル']
  },

  // VRChat Specific
  {
    keywords: ['vrchat', 'アバター改変', 'avatar3.0', 'sdk3', 'udon'],
    tags: ['VRChat']
  },
  {
    keywords: ['quest対応', 'android対応', 'questアバター'],
    tags: ['Quest対応']
  },

  // Licenses and Usage Rights
  {
    keywords: ['商用利用可', '商用可', '商用利用ok'],
    tags: ['商用利用可']
  },
  {
    keywords: ['改変可', '改変ok', 'カスタマイズ可'],
    tags: ['改変可']
  },

  // Content Type
  {
    keywords: ['セット', 'パック', 'バンドル', 'まとめ'],
    tags: ['セット']
  },
  {
    keywords: ['無料', 'フリー', 'free', '0円'],
    tags: ['無料']
  },

  // Style and Aesthetic
  {
    keywords: ['かわいい', 'キュート', 'cute', 'kawaii'],
    tags: ['かわいい']
  },
  {
    keywords: ['かっこいい', 'クール', 'cool', 'カッコイイ'],
    tags: ['かっこいい']
  },
  {
    keywords: ['リアル', 'realistic', 'フォトリアル'],
    tags: ['リアル']
  },
  {
    keywords: ['ファンタジー', 'fantasy', '魔法'],
    tags: ['ファンタジー']
  },
  {
    keywords: ['sf', 'サイバー', 'cyber', 'sci-fi', '未来'],
    tags: ['SF']
  },

  // Specific Features
  {
    keywords: ['物理演算', 'physbone', 'ダイナミックボーン', 'dynamicbone'],
    tags: ['物理演算']
  },
  {
    keywords: ['liltoon', 'ユニティちゃん', 'mtoon', 'poiyomi'],
    tags: ['シェーダー']
  },
];
