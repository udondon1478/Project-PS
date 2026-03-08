import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { NotFoundContent } from '../NotFoundContent';

const TEST_RESOURCES = {
  ja: {
    common: {
      notFound: {
        title: 'ページが見つかりません',
        description: 'お探しのページは削除されたか、URLが変更された可能性があります。',
        backToHome: 'トップページへ戻る',
      },
    },
  },
  en: {
    common: {
      notFound: {
        title: 'Page Not Found',
        description: 'The page you are looking for may have been deleted.',
        backToHome: 'Back to Home',
      },
    },
  },
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

describe('NotFoundContent', () => {
  it('should render translated title in Japanese', () => {
    renderWithI18n(<NotFoundContent />, 'ja');

    expect(screen.getByText('ページが見つかりません')).toBeTruthy();
  });

  it('should render translated title in English', () => {
    renderWithI18n(<NotFoundContent />, 'en');

    expect(screen.getByText('Page Not Found')).toBeTruthy();
  });

  it('should render translated back-to-home link in Japanese', () => {
    renderWithI18n(<NotFoundContent />, 'ja');

    expect(screen.getByText('トップページへ戻る')).toBeTruthy();
  });

  it('should render a link to home page', () => {
    renderWithI18n(<NotFoundContent />, 'en');

    const link = screen.getByRole('link', { name: 'Back to Home' });
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/');
  });

  it('should display 404 status code', () => {
    renderWithI18n(<NotFoundContent />, 'en');

    expect(screen.getByText('404')).toBeTruthy();
  });
});
