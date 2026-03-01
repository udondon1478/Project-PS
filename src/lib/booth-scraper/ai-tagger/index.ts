/**
 * AI Tagger メインエントリ・ファクトリ関数
 */

import type { AIProvider } from './types';
import { GeminiProvider } from './gemini-provider';

export type { AIProvider, AIAnalysisInput, AITagResult, AITagSuggestion } from './types';

/**
 * AIプロバイダーのファクトリ関数
 * ScraperConfigのaiProvider/aiModelに基づいてプロバイダーを生成
 */
export function createAITagger(
  provider: string,
  model: string,
  maxImages: number = 5,
  maxImageSize: number = 512,
): AIProvider {
  switch (provider) {
    case 'gemini':
      return new GeminiProvider(model, maxImages, maxImageSize);
    case 'anthropic': {
      // 遅延import（Phase 4で実装）
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AnthropicProvider } = require('./anthropic-provider');
      return new AnthropicProvider(model, maxImages, maxImageSize);
    }
    default:
      throw new Error(`Unknown AI provider: ${provider}. Supported: gemini, anthropic`);
  }
}
