import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const LOCALES_DIR = path.resolve(__dirname, '../locales');
const LANGUAGES = ['ja', 'en', 'ko'];
const NAMESPACES = ['common', 'home', 'search', 'profile', 'auth', 'footer'];

describe('i18n re-prevention tests', () => {
  describe('[family_tag: what-comment] No What comments in i18n files', () => {
    it('settings.ts should not start with a JSDoc What comment', () => {
      const settingsPath = path.resolve(__dirname, '../settings.ts');
      const content = fs.readFileSync(settingsPath, 'utf-8');
      const firstLine = content.trimStart().split('\n')[0];
      expect(firstLine).not.toMatch(/^\/\*\*/);
    });
  });

  describe('[family_tag: ui-consistency] LanguageSelector uses Radix Select', () => {
    it('LanguageSelector should not use native HTML select element', () => {
      const selectorPath = path.resolve(__dirname, '../../components/LanguageSelector.tsx');
      const content = fs.readFileSync(selectorPath, 'utf-8');
      expect(content).not.toMatch(/<select[\s>]/);
      expect(content).not.toMatch(/<option[\s>]/);
      expect(content).toContain("from '@/components/ui/select'");
    });
  });

  describe('[family_tag: wiring-gap] i18n config is properly wired', () => {
    it('layout.tsx should use I18nProvider', () => {
      const layoutPath = path.resolve(__dirname, '../../app/layout.tsx');
      const content = fs.readFileSync(layoutPath, 'utf-8');
      expect(content).toContain("@/i18n/I18nProvider");
      expect(content).toContain("<I18nProvider>");
    });

    it('old src/lib/i18n.ts should not exist', () => {
      const oldPath = path.resolve(__dirname, '../../lib/i18n.ts');
      expect(fs.existsSync(oldPath)).toBe(false);
    });

    it('ReportList should import from @/i18n/config not @/lib/i18n', () => {
      const reportListPath = path.resolve(__dirname, '../../components/admin/ReportList.tsx');
      const content = fs.readFileSync(reportListPath, 'utf-8');
      expect(content).not.toContain("@/lib/i18n");
      expect(content).toContain("@/i18n/config");
    });
  });

  describe('[family_tag: translation-data] All 6 namespaces exist for all 3 languages', () => {
    for (const lang of LANGUAGES) {
      for (const ns of NAMESPACES) {
        it(`${lang}/${ns}.json should exist and be valid JSON`, () => {
          const filePath = path.join(LOCALES_DIR, lang, `${ns}.json`);
          expect(fs.existsSync(filePath)).toBe(true);
          const content = fs.readFileSync(filePath, 'utf-8');
          const parsed = JSON.parse(content);
          expect(typeof parsed).toBe('object');
          expect(Object.keys(parsed).length).toBeGreaterThan(0);
        });
      }
    }
  });

  describe('[family_tag: translation-data] Translation key consistency across languages', () => {
    for (const ns of NAMESPACES) {
      it(`${ns} namespace should have the same top-level keys in all languages`, () => {
        const jaPath = path.join(LOCALES_DIR, 'ja', `${ns}.json`);
        const enPath = path.join(LOCALES_DIR, 'en', `${ns}.json`);
        const koPath = path.join(LOCALES_DIR, 'ko', `${ns}.json`);

        const jaKeys = Object.keys(JSON.parse(fs.readFileSync(jaPath, 'utf-8'))).sort();
        const enKeys = Object.keys(JSON.parse(fs.readFileSync(enPath, 'utf-8'))).sort();
        const koKeys = Object.keys(JSON.parse(fs.readFileSync(koPath, 'utf-8'))).sort();

        expect(enKeys).toEqual(jaKeys);
        expect(koKeys).toEqual(jaKeys);
      });
    }
  });
});
