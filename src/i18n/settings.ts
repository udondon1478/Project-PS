export const SUPPORTED_LANGUAGES = ['ja', 'en', 'ko'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const FALLBACK_LANGUAGE: SupportedLanguage = 'en';

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  ja: '日本語',
  en: 'English',
  ko: '한국어',
};

export const LANGUAGE_STORAGE_KEY = 'polyseek-language';
