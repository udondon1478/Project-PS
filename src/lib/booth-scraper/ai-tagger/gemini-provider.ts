/**
 * Gemini 2.0 Flash AI Provider
 * Google Generative AI SDKを使用してBOOTH商品を分析
 */

import { GoogleGenerativeAI, type GenerateContentRequest } from '@google/generative-ai';
import type { AIProvider, AIAnalysisInput, AITagResult, AITagSuggestion, ProcessedImage } from './types';
import { buildSystemPrompt, buildUserPrompt, getTagMasterList } from './prompt-builder';
import { fetchAndProcessImages } from './image-fetcher';

// Gemini 2.0 Flash の料金 (USD per 1M tokens)
const GEMINI_INPUT_PRICE_PER_M = 0.075;
const GEMINI_OUTPUT_PRICE_PER_M = 0.30;
const USD_TO_JPY = 150; // 概算レート

/** Gemini APIのレスポンス型 */
interface GeminiTagResponse {
  productType: string;
  aestheticCategory: string | null;
  tags: Array<{
    name: string;
    category: string;
    confidence: number;
  }>;
}

export class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI;
  private modelName: string;
  private maxImages: number;
  private maxImageSize: number;

  constructor(
    modelName: string = 'gemini-2.0-flash',
    maxImages: number = 5,
    maxImageSize: number = 512,
  ) {
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY or GEMINI_API_KEY environment variable is required');
    }
    this.client = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
    this.maxImages = maxImages;
    this.maxImageSize = maxImageSize;
  }

  async analyzeProduct(input: AIAnalysisInput): Promise<AITagResult> {
    // タグマスター取得
    const existingTags = await getTagMasterList();

    // 画像取得・リサイズ
    const images = await fetchAndProcessImages(
      input.imageUrls,
      this.maxImages,
      this.maxImageSize,
    );

    // プロンプト構築
    const systemPrompt = buildSystemPrompt(existingTags);
    const userPrompt = buildUserPrompt(input);

    // Gemini API呼出し
    const model = this.client.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const contents = buildGeminiContents(userPrompt, images);

    const result = await model.generateContent({
      contents,
      systemInstruction: systemPrompt,
    } as GenerateContentRequest);

    const response = result.response;
    const text = response.text();

    // JSONパース
    const parsed = parseGeminiResponse(text);

    // コスト推定
    const usage = response.usageMetadata;
    const inputTokens = usage?.promptTokenCount ?? 0;
    const outputTokens = usage?.candidatesTokenCount ?? 0;
    const estimatedCostYen = this.calculateCostYen(inputTokens, outputTokens);

    return {
      productType: parsed.productType,
      aestheticCategory: parsed.aestheticCategory,
      tags: parsed.tags,
      estimatedCostYen,
      provider: 'gemini',
      model: this.modelName,
    };
  }

  estimateCost(input: AIAnalysisInput): number {
    // 概算: テキスト~2000tokens + 画像~500tokens/枚 + マスター~1000tokens + 出力~500tokens
    const imageCount = Math.min(input.imageUrls.length, this.maxImages);
    const inputTokens = 2000 + imageCount * 500 + 1000;
    const outputTokens = 500;
    return this.calculateCostYen(inputTokens, outputTokens);
  }

  private calculateCostYen(inputTokens: number, outputTokens: number): number {
    const inputCostUsd = (inputTokens / 1_000_000) * GEMINI_INPUT_PRICE_PER_M;
    const outputCostUsd = (outputTokens / 1_000_000) * GEMINI_OUTPUT_PRICE_PER_M;
    return Math.round((inputCostUsd + outputCostUsd) * USD_TO_JPY * 100) / 100;
  }
}

/**
 * Gemini APIのcontentsフォーマットを構築
 */
function buildGeminiContents(
  userPrompt: string,
  images: ProcessedImage[],
): GenerateContentRequest['contents'] {
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  // 画像パーツ
  for (const img of images) {
    parts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: img.base64,
      },
    });
  }

  // テキストパーツ
  parts.push({ text: userPrompt });

  return [{ role: 'user', parts }];
}

/**
 * Geminiレスポンスをパース
 */
function parseGeminiResponse(text: string): GeminiTagResponse {
  try {
    // JSON文字列を抽出（markdown code blockで囲まれている場合も対応）
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Gemini response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as GeminiTagResponse;

    // バリデーション
    if (!parsed.productType || !Array.isArray(parsed.tags)) {
      throw new Error('Invalid response structure');
    }

    // タグのバリデーション・クリーニング
    const validTags: AITagSuggestion[] = parsed.tags
      .filter(
        (t): t is AITagSuggestion =>
          typeof t.name === 'string' &&
          typeof t.category === 'string' &&
          typeof t.confidence === 'number' &&
          t.name.length > 0 &&
          t.confidence >= 0 &&
          t.confidence <= 1,
      )
      .map((t) => ({
        name: t.name.trim(),
        category: t.category,
        confidence: Math.round(t.confidence * 100) / 100,
      }));

    return {
      productType: parsed.productType,
      aestheticCategory: parsed.aestheticCategory ?? null,
      tags: validTags,
    };
  } catch (error) {
    console.error('[GeminiProvider] Failed to parse response:', text);
    throw new Error(`Failed to parse Gemini response: ${error}`);
  }
}
