/**
 * AI Tagger 型定義
 * BOOTH商品をAIで分析し、タグを自動生成するための型
 */

export interface AIProvider {
  analyzeProduct(input: AIAnalysisInput): Promise<AITagResult>;
  estimateCost(input: AIAnalysisInput): number;
}

export interface AIAnalysisInput {
  title: string;
  description: string;
  imageUrls: string[]; // 最大5枚
  ageRating: string | null;
}

export interface AITagResult {
  productType: string; // AI判定の商品タイプ
  aestheticCategory: string | null; // 39美学カテゴリの1つ
  tags: AITagSuggestion[];
  estimatedCostYen: number;
  provider: string;
  model: string;
}

export interface AITagSuggestion {
  name: string;
  category: string; // tagCategories.tsのカテゴリID
  confidence: number; // 0.0-1.0
}

/** Base64エンコードされた画像データ */
export interface ProcessedImage {
  base64: string;
  mimeType: string;
}
