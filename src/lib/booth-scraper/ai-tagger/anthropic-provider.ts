/**
 * Anthropic (Claude) AI Provider
 * Claude Haiku/Sonnetを使用してBOOTH商品を分析
 */

import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, AIAnalysisInput, AITagResult, AITagSuggestion, ProcessedImage } from './types';
import { buildSystemPrompt, buildUserPrompt, getTagMasterList } from './prompt-builder';
import { fetchAndProcessImages } from './image-fetcher';

// Claude Haiku の料金 (USD per 1M tokens)
const HAIKU_INPUT_PRICE_PER_M = 0.80;
const HAIKU_OUTPUT_PRICE_PER_M = 4.00;
// Claude Sonnet の料金 (USD per 1M tokens)
const SONNET_INPUT_PRICE_PER_M = 3.00;
const SONNET_OUTPUT_PRICE_PER_M = 15.00;
const USD_TO_JPY = 150;

interface AnthropicTagResponse {
  productType: string;
  aestheticCategory: string | null;
  tags: Array<{
    name: string;
    category: string;
    confidence: number;
  }>;
}

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private modelName: string;
  private maxImages: number;
  private maxImageSize: number;

  constructor(
    modelName: string = 'claude-haiku-4-5-20251001',
    maxImages: number = 5,
    maxImageSize: number = 512,
  ) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    this.client = new Anthropic({ apiKey });
    this.modelName = modelName;
    this.maxImages = maxImages;
    this.maxImageSize = maxImageSize;
  }

  async analyzeProduct(input: AIAnalysisInput): Promise<AITagResult> {
    const existingTags = await getTagMasterList();
    const images = await fetchAndProcessImages(
      input.imageUrls,
      this.maxImages,
      this.maxImageSize,
    );

    const systemPrompt = buildSystemPrompt(existingTags);
    const userPrompt = buildUserPrompt(input);

    // Anthropic Messages API
    const userContent = buildAnthropicContent(userPrompt, images);

    const response = await this.client.messages.create({
      model: this.modelName,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userContent,
        },
      ],
    });

    // レスポンスからテキストを抽出
    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text content in Anthropic response');
    }

    const parsed = parseAnthropicResponse(textBlock.text);

    // コスト計算
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const estimatedCostYen = this.calculateCostYen(inputTokens, outputTokens);

    return {
      productType: parsed.productType,
      aestheticCategory: parsed.aestheticCategory,
      tags: parsed.tags,
      estimatedCostYen,
      provider: 'anthropic',
      model: this.modelName,
    };
  }

  estimateCost(input: AIAnalysisInput): number {
    const imageCount = Math.min(input.imageUrls.length, this.maxImages);
    const inputTokens = 2000 + imageCount * 1600 + 1000; // Claude画像はより多くのトークンを消費
    const outputTokens = 500;
    return this.calculateCostYen(inputTokens, outputTokens);
  }

  private calculateCostYen(inputTokens: number, outputTokens: number): number {
    const isHaiku = this.modelName.includes('haiku');
    const inputPrice = isHaiku ? HAIKU_INPUT_PRICE_PER_M : SONNET_INPUT_PRICE_PER_M;
    const outputPrice = isHaiku ? HAIKU_OUTPUT_PRICE_PER_M : SONNET_OUTPUT_PRICE_PER_M;

    const inputCostUsd = (inputTokens / 1_000_000) * inputPrice;
    const outputCostUsd = (outputTokens / 1_000_000) * outputPrice;
    return Math.round((inputCostUsd + outputCostUsd) * USD_TO_JPY * 100) / 100;
  }
}

/**
 * Anthropic Messages APIのcontentフォーマットを構築
 */
type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

function buildAnthropicContent(
  userPrompt: string,
  images: ProcessedImage[],
): Anthropic.MessageCreateParams['messages'][0]['content'] {
  const content: Anthropic.MessageCreateParams['messages'][0]['content'] = [];

  // 画像パーツ
  for (const img of images) {
    (content as Array<unknown>).push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: img.mimeType as ImageMediaType,
        data: img.base64,
      },
    });
  }

  // テキストパーツ
  (content as Array<unknown>).push({ type: 'text', text: userPrompt });

  return content;
}

/**
 * Anthropicレスポンスをパース
 */
function parseAnthropicResponse(text: string): AnthropicTagResponse {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Anthropic response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as AnthropicTagResponse;

    if (!parsed.productType || !Array.isArray(parsed.tags)) {
      throw new Error('Invalid response structure');
    }

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
    console.error('[AnthropicProvider] Failed to parse response:', text);
    throw new Error(`Failed to parse Anthropic response: ${error}`);
  }
}
