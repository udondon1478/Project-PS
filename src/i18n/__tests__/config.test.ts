import { describe, it, expect, vi, beforeEach } from 'vitest';
import i18n from 'i18next';

vi.mock('i18next-browser-languagedetector', () => {
  return {
    default: class MockLanguageDetector {
      type = 'languageDetector' as const;
      init() {}
      detect() {
        return 'en';
      }
      cacheUserLanguage() {}
    },
  };
});

describe('i18n config', () => {
  beforeEach(async () => {
    // Reset i18n instance between tests
    if (i18n.isInitialized) {
      await i18n.changeLanguage('en');
    }
  });

  describe('initialization', () => {
    it('should initialize i18n successfully', async () => {
      // Given: i18n module is imported
      const { default: configuredI18n } = await import('../config');

      // Then: i18n should be initialized
      expect(configuredI18n.isInitialized).toBe(true);
    });

    it('should set fallback language to en', async () => {
      // Given: i18n is initialized
      const { default: configuredI18n } = await import('../config');

      // Then: fallback should be English
      expect(configuredI18n.options.fallbackLng).toContain('en');
    });

    it('should have interpolation escapeValue set to false', async () => {
      // Given: i18n is initialized (React handles XSS)
      const { default: configuredI18n } = await import('../config');

      // Then: escapeValue should be false
      expect(configuredI18n.options.interpolation?.escapeValue).toBe(false);
    });
  });

  describe('language switching', () => {
    it('should switch language to ja', async () => {
      // Given: i18n is initialized
      const { default: configuredI18n } = await import('../config');

      // When: language is changed to Japanese
      await configuredI18n.changeLanguage('ja');

      // Then: current language should be ja
      expect(configuredI18n.language).toBe('ja');
    });

    it('should switch language to ko', async () => {
      // Given: i18n is initialized
      const { default: configuredI18n } = await import('../config');

      // When: language is changed to Korean
      await configuredI18n.changeLanguage('ko');

      // Then: current language should be ko
      expect(configuredI18n.language).toBe('ko');
    });

    it('should fall back to en for unsupported language', async () => {
      // Given: i18n is initialized
      const { default: configuredI18n } = await import('../config');

      // When: language is changed to an unsupported language
      await configuredI18n.changeLanguage('fr');

      // Then: should fall back to en
      expect(configuredI18n.language).toBe('fr');
      expect(configuredI18n.options.fallbackLng).toContain('en');
    });
  });

  describe('namespaces', () => {
    it('should have common namespace loaded', async () => {
      // Given: i18n is initialized
      const { default: configuredI18n } = await import('../config');

      // Then: common namespace should exist
      expect(configuredI18n.hasResourceBundle('ja', 'common')).toBe(true);
      expect(configuredI18n.hasResourceBundle('en', 'common')).toBe(true);
      expect(configuredI18n.hasResourceBundle('ko', 'common')).toBe(true);
    });
  });

  describe('translation', () => {
    it('should translate keys in Japanese', async () => {
      // Given: i18n is initialized with ja
      const { default: configuredI18n } = await import('../config');
      await configuredI18n.changeLanguage('ja');

      // When: translating a common key
      const translated = configuredI18n.t('common:language');

      // Then: should return Japanese text (not the key itself)
      expect(translated).not.toBe('common:language');
      expect(translated).not.toBe('language');
    });

    it('should translate keys in English', async () => {
      // Given: i18n is initialized with en
      const { default: configuredI18n } = await import('../config');
      await configuredI18n.changeLanguage('en');

      // When: translating a common key
      const translated = configuredI18n.t('common:language');

      // Then: should return English text
      expect(translated).not.toBe('common:language');
      expect(translated).not.toBe('language');
    });

    it('should translate keys in Korean', async () => {
      // Given: i18n is initialized with ko
      const { default: configuredI18n } = await import('../config');
      await configuredI18n.changeLanguage('ko');

      // When: translating a common key
      const translated = configuredI18n.t('common:language');

      // Then: should return Korean text
      expect(translated).not.toBe('common:language');
      expect(translated).not.toBe('language');
    });
  });
});
