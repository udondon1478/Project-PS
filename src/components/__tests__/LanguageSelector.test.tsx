import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import LanguageSelector from '../LanguageSelector';

const TEST_RESOURCES = {
  ja: { common: { language: '言語' } },
  en: { common: { language: 'Language' } },
  ko: { common: { language: '언어' } },
};

function createTestI18n(lng: string) {
  const testI18n = i18n.createInstance();
  testI18n.use(initReactI18next).init({
    resources: TEST_RESOURCES,
    lng,
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  });
  return testI18n;
}

function renderWithI18n(ui: React.ReactElement, lng: string) {
  const testI18n = createTestI18n(lng);
  return {
    ...render(<I18nextProvider i18n={testI18n}>{ui}</I18nextProvider>),
    i18n: testI18n,
  };
}

describe('LanguageSelector', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('rendering', () => {
    it('should render a language selector trigger', () => {
      renderWithI18n(<LanguageSelector />, 'ja');

      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeTruthy();
    });

    it('should show current language label in the trigger when language is ja', () => {
      renderWithI18n(<LanguageSelector />, 'ja');

      const trigger = screen.getByRole('combobox');
      expect(trigger.textContent).toContain('日本語');
    });

    it('should show current language label in the trigger when language is en', () => {
      renderWithI18n(<LanguageSelector />, 'en');

      const trigger = screen.getByRole('combobox');
      expect(trigger.textContent).toContain('English');
    });

    it('should show current language label in the trigger when language is ko', () => {
      renderWithI18n(<LanguageSelector />, 'ko');

      const trigger = screen.getByRole('combobox');
      expect(trigger.textContent).toContain('한국어');
    });
  });

  describe('i18n integration', () => {
    it('should initialize with the correct language', () => {
      const { i18n: testI18n } = renderWithI18n(<LanguageSelector />, 'ja');

      expect(testI18n.language).toBe('ja');
    });

    it('should reflect English language state', () => {
      const { i18n: testI18n } = renderWithI18n(<LanguageSelector />, 'en');

      expect(testI18n.language).toBe('en');
    });
  });

  describe('Radix Select structure', () => {
    it('should use Radix Select (not native select element)', () => {
      const { container } = renderWithI18n(<LanguageSelector />, 'ja');

      const nativeSelect = container.querySelector('select');
      expect(nativeSelect).toBeNull();
    });

    it('should have a combobox trigger element', () => {
      renderWithI18n(<LanguageSelector />, 'ja');

      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeTruthy();
      expect(trigger.tagName.toLowerCase()).toBe('button');
    });
  });
});
