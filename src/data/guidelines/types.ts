// レーティングレベル
/**
 * レーティングレベルを表す型
 * @example 'general', 'explicit'
 */
export const RATING_LEVELS = ['general', 'sensitive', 'questionable', 'explicit'] as const;

export type RatingLevel = typeof RATING_LEVELS[number];

// フローチャートの質問タイプ
/**
 * フローチャートの質問ノード
 * @property id - 質問の一意なID
 * @property text - 質問本文
 * @property description - 補足説明（オプション）
 * @property yesNext - "はい"選択時の遷移先（次の質問ID または 判定結果RatingLevel）
 * @property noNext - "いいえ"選択時の遷移先（次の質問ID または 判定結果RatingLevel）
 * @property order - 表示順序（管理用）
 */
export interface FlowchartQuestion {
  id: string;
  text: string;
  description?: string;
  yesNext: string | RatingLevel;
  noNext: string | RatingLevel;
  order: number;
}

// フローチャート全体
/**
 * フローチャート全体の定義
 * @property questions - 質問ノードのリスト
 * @property startQuestionId - 最初の質問ID
 */
export interface RatingFlowchart {
  questions: FlowchartQuestion[];
  startQuestionId: string;
}

// レーティングガイドライン
/**
 * レーティングガイドラインの詳細コンテンツ
 * @property level - レーティングレベル
 * @property label - 表示ラベル（例：全年齢、R-18）
 * @property emoji - 表示用絵文字
 * @property color - テーマカラー
 * @property definition - 定義文
 * @property examples - 具体例のリスト
 * @property warnings - 注意事項のリスト（オプション）
 */
export interface RatingGuidelineContent {
  level: RatingLevel;
  label: string;
  emoji: string;
  color: string;
  definition: string;
  examples: string[];
  warnings?: string[];
}

// タグカテゴリ
/**
 * タグのカテゴリ情報
 * @property id - カテゴリID
 * @property name - カテゴリ名（日本語）
 * @property nameEn - カテゴリ名（英語）
 * @property color - 表示色
 * @property description - 説明
 * @property examples - 具体的なタグ例
 * @property priority - 表示優先度
 */
export interface TagCategoryInfo {
  id: string;
  name: string;
  nameEn: string;
  color: string;
  description: string;
  examples: string[];
  priority: number;
}

// ガイドラインセクション
/**
 * ドキュメントのセクション
 * @property id - セクションID
 * @property title - タイトル
 * @property content - 本文（Markdown）
 * @property subsections - サブセクション（ネスト構造）
 */
export interface GuidelineSection {
  id: string;
  title: string;
  content: string;
  subsections?: GuidelineSection[];
}

// モード
/**
 * フローチャートの表示モード
 * @value 'interactive' - 対話形式
 * @value 'diagram' - 全体図形式
 */
export type FlowchartMode = 'interactive' | 'diagram';
