// レーティングレベル
export type RatingLevel = 'general' | 'sensitive' | 'questionable' | 'explicit';

// フローチャートの質問タイプ
export interface FlowchartQuestion {
  id: string;
  text: string;
  description?: string;
  yesNext: string | RatingLevel;  // 次の質問ID or レーティング結果
  noNext: string | RatingLevel;
  order: number;
}

// フローチャート全体
export interface RatingFlowchart {
  questions: FlowchartQuestion[];
  startQuestionId: string;
}

// レーティングガイドライン
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
export interface GuidelineSection {
  id: string;
  title: string;
  content: string;
  subsections?: GuidelineSection[];
}

// モード
export type FlowchartMode = 'interactive' | 'diagram';
