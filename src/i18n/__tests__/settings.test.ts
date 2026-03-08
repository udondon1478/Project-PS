import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_LANGUAGES,
  FALLBACK_LANGUAGE,
  LANGUAGE_LABELS,
  type SupportedLanguage,
} from '../settings';

describe('i18n settings', () => {
  describe('SUPPORTED_LANGUAGES', () => {
    it('should include ja, en, ko', () => {
      expect(SUPPORTED_LANGUAGES).toContain('ja');
      expect(SUPPORTED_LANGUAGES).toContain('en');
      expect(SUPPORTED_LANGUAGES).toContain('ko');
    });

    it('should have exactly 3 languages', () => {
      expect(SUPPORTED_LANGUAGES).toHaveLength(3);
    });
  });

  describe('FALLBACK_LANGUAGE', () => {
    it('should be en', () => {
      expect(FALLBACK_LANGUAGE).toBe('en');
    });

    it('should be included in SUPPORTED_LANGUAGES', () => {
      expect(SUPPORTED_LANGUAGES).toContain(FALLBACK_LANGUAGE);
    });
  });

  describe('LANGUAGE_LABELS', () => {
    it('should have a label for each supported language', () => {
      for (const lang of SUPPORTED_LANGUAGES) {
        expect(LANGUAGE_LABELS[lang]).toBeDefined();
        expect(typeof LANGUAGE_LABELS[lang]).toBe('string');
        expect(LANGUAGE_LABELS[lang].length).toBeGreaterThan(0);
      }
    });

    it('should display Japanese as 日本語', () => {
      expect(LANGUAGE_LABELS.ja).toBe('日本語');
    });

    it('should display English as English', () => {
      expect(LANGUAGE_LABELS.en).toBe('English');
    });

    it('should display Korean as 한국어', () => {
      expect(LANGUAGE_LABELS.ko).toBe('한국어');
    });
  });

  describe('SupportedLanguage type', () => {
    it('should accept valid language codes', () => {
      const ja: SupportedLanguage = 'ja';
      const en: SupportedLanguage = 'en';
      const ko: SupportedLanguage = 'ko';

      expect(ja).toBe('ja');
      expect(en).toBe('en');
      expect(ko).toBe('ko');
    });
  });
});
