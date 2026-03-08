import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { signIn } from 'next-auth/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

import SignInContent from '../SignInContent';

const mockSignIn = vi.mocked(signIn);

const TEST_RESOURCES = {
  ja: {
    auth: {
      dialog: {
        login: {
          title: 'ログイン',
          description: '以下のいずれかの方法でログインしてください。',
        },
      },
      provider: {
        google: { login: 'Googleでログイン' },
        discord: { login: 'Discordでログイン' },
      },
      errors: {
        OAuthAccountNotLinked: 'このメールアドレスは既に別の方法で登録されています。元の方法でログインしてください。',
        OAuthSignin: 'OAuth認証の開始に失敗しました。もう一度お試しください。',
        default: '認証中にエラーが発生しました。もう一度お試しください。',
      },
    },
  },
};

function createTestI18n() {
  const testI18n = i18n.createInstance();
  testI18n.use(initReactI18next).init({
    resources: TEST_RESOURCES,
    lng: 'ja',
    fallbackLng: 'ja',
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  });
  return testI18n;
}

function renderWithI18n(ui: React.ReactElement) {
  const testI18n = createTestI18n();
  return render(<I18nextProvider i18n={testI18n}>{ui}</I18nextProvider>);
}

describe('SignInContent', () => {
  beforeEach(() => {
    mockSignIn.mockClear();
  });

  describe('rendering', () => {
    it('should render sign-in page heading', () => {
      renderWithI18n(<SignInContent />);

      expect(screen.getByRole('heading', { name: /ログイン/ })).toBeTruthy();
    });

    it('should render Google sign-in button', () => {
      renderWithI18n(<SignInContent />);

      expect(screen.getByRole('button', { name: /Google/ })).toBeTruthy();
    });

    it('should render Discord sign-in button', () => {
      renderWithI18n(<SignInContent />);

      expect(screen.getByRole('button', { name: /Discord/ })).toBeTruthy();
    });
  });

  describe('error display', () => {
    it('should not show error alert when no error prop', () => {
      renderWithI18n(<SignInContent />);

      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('should show error alert when error prop is provided', () => {
      renderWithI18n(<SignInContent error="OAuthSignin" />);

      expect(screen.getByRole('alert')).toBeTruthy();
    });

    it('should show specific message for OAuthAccountNotLinked error', () => {
      renderWithI18n(<SignInContent error="OAuthAccountNotLinked" />);

      expect(screen.getByText(/別の方法/)).toBeTruthy();
    });
  });

  describe('sign-in actions', () => {
    it('should call signIn with google provider when Google button is clicked', () => {
      renderWithI18n(<SignInContent />);

      fireEvent.click(screen.getByRole('button', { name: /Google/ }));

      expect(mockSignIn).toHaveBeenCalled();
      expect(mockSignIn.mock.calls[0][0]).toBe('google');
    });

    it('should call signIn with discord provider when Discord button is clicked', () => {
      renderWithI18n(<SignInContent />);

      fireEvent.click(screen.getByRole('button', { name: /Discord/ }));

      expect(mockSignIn).toHaveBeenCalled();
      expect(mockSignIn.mock.calls[0][0]).toBe('discord');
    });

    it('should pass callbackUrl to signIn when callbackUrl prop is provided', () => {
      renderWithI18n(<SignInContent callbackUrl="/dashboard" />);

      fireEvent.click(screen.getByRole('button', { name: /Google/ }));

      expect(mockSignIn).toHaveBeenCalledWith(
        'google',
        expect.objectContaining({ callbackUrl: '/dashboard' })
      );
    });
  });
});
