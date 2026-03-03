import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { PropsWithChildren } from 'react';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import AuthErrorPage from '../page';

async function renderPage(error?: string) {
  cleanup();
  const searchParams = Promise.resolve({ error });
  const jsx = await AuthErrorPage({ searchParams });
  return render(jsx);
}

describe('AuthErrorPage', () => {
  describe('Configuration error', () => {
    it('should display server configuration error heading', async () => {
      // Given: a Configuration error code
      // When: rendering the error page
      await renderPage('Configuration');

      // Then: a server configuration error heading is shown
      expect(screen.getByText('サーバー設定エラー')).toBeTruthy();
    });
  });

  describe('AccessDenied error', () => {
    it('should display access denied heading', async () => {
      // Given: an AccessDenied error code
      // When: rendering the error page
      await renderPage('AccessDenied');

      // Then: an access denied heading is shown
      expect(screen.getByText('アクセスが拒否されました')).toBeTruthy();
    });
  });

  describe('Verification error', () => {
    it('should display verification expired heading', async () => {
      // Given: a Verification error code
      // When: rendering the error page
      await renderPage('Verification');

      // Then: a verification expired heading is shown
      expect(screen.getByText('認証リンクの有効期限切れ')).toBeTruthy();
    });
  });

  describe('unknown error code', () => {
    it('should display default error heading', async () => {
      // Given: an unknown error code
      // When: rendering the error page
      await renderPage('SomeUnknownError');

      // Then: a generic authentication error heading is shown
      expect(screen.getByText('認証エラー')).toBeTruthy();
    });
  });

  describe('Default error code', () => {
    it('should display default error heading for Default code', async () => {
      // Given: a Default error code (sent by NextAuth for generic errors)
      // When: rendering the error page
      await renderPage('Default');

      // Then: a generic authentication error heading is shown
      expect(screen.getByText('認証エラー')).toBeTruthy();
    });
  });

  describe('missing error parameter', () => {
    it('should display default error heading when error is undefined', async () => {
      // Given: no error parameter
      // When: rendering the error page
      await renderPage(undefined);

      // Then: a generic authentication error heading is shown
      expect(screen.getByText('認証エラー')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should render a link to the home page', async () => {
      // Given: any error code
      // When: rendering the error page
      await renderPage('Configuration');

      // Then: a link to the home page is shown
      const homeLink = screen.getByRole('link', { name: /トップページ/ });
      expect(homeLink.getAttribute('href')).toBe('/');
    });

    it('should render a re-login link for AccessDenied error', async () => {
      // Given: an AccessDenied error
      // When: rendering the error page
      await renderPage('AccessDenied');

      // Then: a re-login link pointing to the signin page is shown
      const loginLink = screen.getByRole('link', { name: /ログイン/ });
      expect(loginLink.getAttribute('href')).toContain('/auth/signin');
    });
  });
});
