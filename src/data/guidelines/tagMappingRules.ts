/**
 * タグ自動マッピングルール
 * 既存タグを新カテゴリ（10カテゴリ）に自動分類するためのルール定義
 *
 * 実際の使用タグ分析に基づいて最適化
 *
 * マッチング優先度:
 * 1. exactMatch: 完全一致（最優先）
 * 2. keywords: キーワード部分一致
 * 3. patterns: 正規表現パターン
 */

export interface MappingRule {
  /** ルールの説明 */
  description: string;
  /** 完全一致するタグ名のリスト */
  exactMatch?: string[];
  /** 部分一致するキーワード（大文字小文字無視） */
  keywords?: string[];
  /** 正規表現パターン（大文字小文字無視） */
  patterns?: RegExp[];
  /** 除外キーワード（これを含む場合はマッチしない） */
  excludeKeywords?: string[];
}

export type CategoryMappingRules = Record<string, MappingRule>;

/**
 * カテゴリ別マッピングルール
 * 上から順に評価され、最初にマッチしたカテゴリが適用される
 */
export const categoryMappingRules: CategoryMappingRules = {
  // === rating: レーティング ===
  rating: {
    description: '年齢制限・レーティング',
    exactMatch: [
      '全年齢', 'R-15', 'R-17', 'R-18',
      'general', 'sensitive', 'questionable', 'explicit',
      'rating:general', 'rating:sensitive', 'rating:questionable', 'rating:explicit',
    ],
    keywords: [
      'r-18', 'r18', 'r-15', 'r15', 'r-17', 'r17',
      '成人向け', '18禁',
    ],
  },

  // === product_type: 商品種別 ===
  // 最初に評価して「アニメーション」等を正しく分類
  product_type: {
    description: '商品の種類（3Dモデル、アニメーション、テクスチャなど）',
    exactMatch: [
      '3dモデル', '3Dモデル', '3d model',
      'アニメーション', 'animation', 'animations',
      'テクスチャ', 'texture', 'textures',
      '3dテクスチャ', '3Dテクスチャ',
      '3d衣装', '3D衣装',
      '3d装飾品', '3D装飾品',
      '3d小道具', '3D小道具',
      '3dモーション・アニメーション',
      'ポーズ集', 'ポーズ', 'pose',
      'ギミック', 'gimmick',
      'エフェクト', 'effect', 'particle', 'パーティクル',
      '表情', '表情アニメーション', 'まばたき', 'まばたきアニメーション',
      'animationclip', 'animation設定済み', 'animation assets',
      'animation emote', 'animation pose', 'animation vrchat',
      'アニメーション素材', 'ポーズアニメーション',
      'afkアニメーション', 'AFKアニメーション',
      'eyetexture', 'アイテクスチャ', '瞳テクスチャ', 'eye texture',
    ],
    keywords: [
      '3dモデル', '3dテクスチャ', '3d衣装', '3d装飾品', '3d小道具',
    ],
    patterns: [
      /^3d/i,
      /アニメーション$/,
      /テクスチャ$/,
      /ポーズ(集)?$/,
    ],
  },

  // === platform: プラットフォーム ===
  // VRChat関連を正しく分類
  platform: {
    description: '対応環境・プラットフォーム',
    exactMatch: [
      'vrchat', 'VRChat',
      'vrc想定モデル', 'VRC想定モデル',
      'vrchat向け', 'VRChat向け',
      'vrchat可', 'VRChat可',
      'vrchat想定モデル', 'VRChat想定モデル',
      'vrchat利用可', 'vrcHAT利用可',
      'vrchat3d', 'VRCHAT3D',
      'vrchat model',
      'Quest対応', 'quest_compatible', 'quest対応',
      'PC専用', 'pc_only', 'PC only',
      'Android対応', 'android_compatible',
      'VRM', 'vrm',
      'VRoid', 'vroid', 'VRoid Studio', 'vroid studio',
      'cross_platform', 'クロスプラットフォーム',
      'optimized', '最適化済み',
      'vket', 'バーチャルマーケット',
      'cluster', 'クラスター',
      'neos', 'resonite', 'chilloutvr',
    ],
    keywords: [
      'quest', 'クエスト',
      'vroid',
    ],
    patterns: [
      /^vrchat/i,
      /^vrc想定/i,
      /^vrc[^a-z]/i,
      /quest/i,
      /android/i,
      /^(pc|quest)専用$/i,
    ],
    excludeKeywords: [
      'アクセサリー', 'ギミック', 'アバター', 'avatar',
    ],
  },

  // === avatar: アバター ===
  avatar: {
    description: 'VRChatアバター・キャラクター名',
    exactMatch: [
      // 分析で確認された人気アバター名
      'しなの', 'shinano',
      'マヌカ', 'manuka',
      'ミルティナ', 'miltina',
      'ルルネ', 'rurune',
      'ショコラ', 'chocolat',
      'キプフェル', 'kipfel',
      'ルミナ', 'lumina',
      'まめひなた', 'mamehinata',
      '桔梗', 'kikyo',
      '舞夜', 'maiya',
      'セレスティア', 'celestia',
      'イメリス', 'imeris',
      'カルディア', 'cardia',
      'ラスク', 'rusk',
      'リーファ', 'leefa',
      'アッシュ', 'ash',
      'チセ', 'chise',
      'ユキ', 'yuki',
      'サフィー', 'saphie',
      // 種族
      'ケモノ', 'kemono', 'furry', 'ドラゴン', 'dragon',
    ],
  },

  // === feature: 機能・対応アバター ===
  feature: {
    description: 'VRChat機能・カスタマイズ性・対応アバター',
    exactMatch: [
      'PhysBone対応', 'phys_bones', 'PhysBones',
      'avatar_dynamics', 'Avatar Dynamics',
      'Modular Avatar対応', 'modular_avatar', 'MA対応',
      'ModularAvatar', 'modular avatar',
      'gesture_expressions', 'ジェスチャー表情',
      'eye_tracking', 'アイトラッキング',
      'face_tracking', 'フェイストラッキング',
      'full_body_tracking', 'フルトラ', 'フルボディトラッキング',
      'lip_sync', 'リップシンク',
      'アバターギミック',
    ],
    keywords: [
      'physbone', 'phys_bone', 'フィズボーン',
      'modular', 'モジュラー',
      'toggle', 'トグル',
      'customizable', 'カスタマイズ',
      'changeable', '着せ替え', '色替え', '色変え',
      'tracking', 'トラッキング',
      'expression', '表情切り替え',
      'emote', 'エモート',
    ],
    patterns: [
      /対応$/,  // 〇〇対応（アバター対応タグ）
      /可能$/,
      /_support$/i,
      /_ready$/i,
    ],
    excludeKeywords: [
      'quest対応', 'pc対応', 'android対応', 'vrm対応',
    ],
  },

  // === body: 身体 ===
  body: {
    description: '身体的特徴（髪型・瞳・耳・尻尾など）',
    exactMatch: [
      '髪型', '目',
    ],
    keywords: [
      // 髪型
      'hair', '髪', 'twintail', 'ツインテール', 'ponytail', 'ポニーテール',
      'ボブ', 'bob', 'ショートヘア', 'ロングヘア', 'long_hair', 'short_hair',
      'ahoge', 'アホ毛', 'twin_tail', 'side_tail',
      // 髪色
      'blonde', 'black_hair', 'brown_hair', 'red_hair', 'blue_hair',
      'pink_hair', 'white_hair', 'silver_hair', 'green_hair', 'purple_hair',
      '金髪', '黒髪', '茶髪', '赤髪', '青髪', 'ピンク髪', '白髪', '銀髪',
      // 瞳（テクスチャは除外）
      'heterochromia', 'オッドアイ',
      'blue_eyes', 'red_eyes', 'green_eyes', 'purple_eyes', 'gold_eyes',
      // 耳
      'ear', '耳', 'ケモミミ', 'kemomimi', 'cat_ear', 'fox_ear', 'dog_ear',
      'rabbit_ear', 'elf_ear', '猫耳', '狐耳', '犬耳', 'うさ耳', 'エルフ耳',
      // 尻尾
      'tail', '尻尾', 'しっぽ', 'cat_tail', 'fox_tail', '猫尻尾', '狐尻尾',
      // 体型
      'body', '体型', 'slender', 'スレンダー', 'petite', '小柄',
      'curvy', 'muscular', '筋肉', 'athletic',
      // その他身体特徴
      'wing', '翼', 'horn', '角', 'halo', '光輪', 'fang', '牙',
    ],
    patterns: [
      /_hair$/i,
      /_eyes?$/i,
      /_ear[s]?$/i,
      /_tail$/i,
      /^(長|短|ミディアム)髪/,
      /髪(型|色|の)/,
    ],
    excludeKeywords: [
      'eyetexture', 'アイテクスチャ', '瞳テクスチャ', 'eye texture',
    ],
  },

  // === outfit: 衣装 ===
  outfit: {
    description: '衣服・アクセサリー・装飾品',
    exactMatch: [
      'イヤリング・ピアス',
      'アクセサリー(その他)', 'アクセサリー（その他）',
      '水着',
    ],
    keywords: [
      // 一般的な衣装
      'outfit', 'costume', 'コスチューム',
      'uniform', '制服', '学生服', 'school_uniform',
      'maid', 'メイド', 'メイド服',
      'dress', 'ドレス', 'ワンピース',
      'swimsuit', 'bikini', 'ビキニ',
      'kimono', '着物', '和服', 'yukata', '浴衣',
      'hoodie', 'パーカー', 'sweater', 'セーター',
      'jacket', 'ジャケット', 'coat', 'コート',
      'skirt', 'スカート', 'pants', 'ズボン',
      'shirt', 'シャツ', 'blouse', 'ブラウス',
      'armor', '鎧', '甲冑',
      // 靴
      'boots', 'ブーツ', 'shoes', '靴', 'heels', 'ヒール',
      // アクセサリー
      'accessory', 'アクセサリー',
      'glasses', '眼鏡', 'メガネ',
      'ribbon', 'リボン',
      'choker', 'チョーカー',
      'necklace', 'ネックレス',
      'earring', 'イヤリング', 'ピアス',
      'bracelet', 'ブレスレット',
      'hat', '帽子', 'cap', 'キャップ',
      'mask', 'マスク', '仮面',
      'glove', '手袋', 'グローブ',
      'sock', '靴下', 'ソックス', 'ストッキング',
    ],
    patterns: [
      /_outfit$/i,
      /_uniform$/i,
      /_costume$/i,
      /_dress$/i,
      /_wear$/i,
    ],
    excludeKeywords: [
      'vrchat', 'vrc', '3d衣装',
    ],
  },

  // === style: スタイル ===
  style: {
    description: 'アートスタイル・ジャンル',
    exactMatch: [
      'anime', 'アニメ', 'アニメ調',
      'realistic', 'リアル', 'リアル調', 'semi_realistic', 'セミリアル',
      'chibi', 'ちび', 'ちびキャラ', 'SD',
      'kemono', 'ケモノ', 'furry', 'ファーリー',
      'stylized', 'pixel_art', 'ドット絵',
      'cyberpunk', 'サイバーパンク',
      'fantasy', 'ファンタジー',
      'gothic', 'ゴシック',
      'retro', 'レトロ',
      'modern', 'モダン',
      'military', 'ミリタリー',
      'sci-fi', 'SF',
    ],
    keywords: [
      'style', 'スタイル',
    ],
    patterns: [
      /調$/,
      /系$/,
    ],
    excludeKeywords: [
      'アニメーション', 'animation',
    ],
  },

  // === technical: 技術仕様 ===
  technical: {
    description: 'ファイル形式・シェーダー・性能・Unityバージョン',
    exactMatch: [
      // ファイル形式
      'FBX', 'fbx', 'Unity_Package', 'unitypackage', 'UnityPackage',
      'blend', 'Blender', 'blender',
      'Blendshape', 'blendshape',
      // シェーダー
      'lilToon', 'liltoon', 'Liltoon', 'リルトゥーン',
      'Poiyomi', 'poiyomi', 'ポイヨミ',
      'UTS', 'UTS2', 'Unity Toon Shader',
      'standard_shader', 'Standard Shader',
      // Unity
      'Unity', 'unity',
      'Unity2019', 'Unity2020', 'Unity2021', 'Unity2022', 'Unity2023',
      'unity_2019', 'unity_2020', 'unity_2021', 'unity_2022', 'unity_2023',
      // ポリゴン数
      'low_poly', 'ローポリ', 'ロウポリ',
      'medium_poly', 'ミディアムポリ',
      'high_poly', 'ハイポリ',
      'very_high_poly', '超ハイポリ',
    ],
    keywords: [
      // シェーダー
      'shader', 'シェーダー', 'シェーダ',
      'toon', 'トゥーン',
      'sunao',
      // ポリゴン
      'polygon', 'ポリゴン', 'poly',
      'tris', 'triangle', '三角形',
      // SDK
      'sdk', 'sdk3', 'avatars3.0',
      // その他技術用語
      'uv', 'psd', 'レイヤー', 'マテリアル', 'material',
      'rig', 'リグ', 'bone', 'ボーン',
      'weight', 'ウェイト',
      'blendshape', 'ブレンドシェイプ', 'シェイプキー',
    ],
    patterns: [
      /unity\d{4}/i,
      /\d+k_texture/i,
      /(low|medium|high)_poly/i,
      /^(fbx|blend|psd|png|jpg)$/i,
      /シェーダ[ー]?/,
      /ポリ(ゴン)?$/,
    ],
    excludeKeywords: [
      'unitypackage',  // exactMatchで処理
    ],
  },

  // === general: 一般（フォールバック）===
  general: {
    description: '上記に該当しない一般的なタグ',
    exactMatch: [
      'cute', 'かわいい', '可愛い',
      'cool', 'クール', 'かっこいい',
      'sexy', 'セクシー',
      'funny', 'ネタ', 'おもしろ',
      'original', 'オリジナル',
      'recommended', 'おすすめ',
      '無料', 'free',
    ],
    keywords: [],
  },
};

/**
 * タグ名から適切なカテゴリIDを判定する
 * @param tagName タグ名（正規化済み）
 * @param displayName 表示名（オプション）
 * @returns カテゴリID
 */
export function determineCategory(tagName: string, displayName?: string): string {
  const normalizedName = tagName.toLowerCase();
  const normalizedDisplay = displayName?.toLowerCase() || '';

  // カテゴリ順に評価（優先度順）
  const categoryOrder = [
    'rating',
    'product_type',  // アニメーション等を先に判定
    'platform',      // VRChat関連を先に判定
    'avatar',
    'feature',
    'body',
    'outfit',
    'style',
    'technical',
  ];

  for (const categoryId of categoryOrder) {
    const rules = categoryMappingRules[categoryId];
    if (!rules) continue;

    // 除外キーワードチェック
    if (rules.excludeKeywords) {
      let excluded = false;
      for (const excludeKeyword of rules.excludeKeywords) {
        const lowerExclude = excludeKeyword.toLowerCase();
        if (normalizedName.includes(lowerExclude) || normalizedDisplay.includes(lowerExclude)) {
          excluded = true;
          break;
        }
      }
      if (excluded) continue;
    }

    // 1. 完全一致チェック
    if (rules.exactMatch) {
      const exactMatches = rules.exactMatch.map(m => m.toLowerCase());
      if (exactMatches.includes(normalizedName) || exactMatches.includes(normalizedDisplay)) {
        return categoryId;
      }
    }

    // 2. キーワード部分一致チェック
    if (rules.keywords) {
      for (const keyword of rules.keywords) {
        const lowerKeyword = keyword.toLowerCase();
        if (normalizedName.includes(lowerKeyword) || normalizedDisplay.includes(lowerKeyword)) {
          return categoryId;
        }
      }
    }

    // 3. 正規表現パターンチェック
    if (rules.patterns) {
      for (const pattern of rules.patterns) {
        if (pattern.test(tagName) || (displayName && pattern.test(displayName))) {
          return categoryId;
        }
      }
    }
  }

  // どのルールにもマッチしなければgeneral
  return 'general';
}

/**
 * マッピング結果の統計情報
 */
export interface MappingStats {
  total: number;
  byCategory: Record<string, number>;
  unmapped: number;
}
