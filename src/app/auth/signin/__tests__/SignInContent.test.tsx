import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { signIn } from 'next-auth/react';

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

import SignInContent from '../SignInContent';

const mockSignIn = vi.mocked(signIn);

describe('SignInContent', () => {
  beforeEach(() => {
    mockSignIn.mockClear();
  });

  describe('rendering', () => {
    it('should render sign-in page heading', () => {
      // Given: no props
      // When: rendering SignInContent
      render(<SignInContent />);

      // Then: a sign-in heading is displayed in Japanese
      expect(screen.getByRole('heading', { name: /ログイン/ })).toBeTruthy();
    });

    it('should render Google sign-in button', () => {
      // Given: no props
      // When: rendering SignInContent
      render(<SignInContent />);

      // Then: a Google sign-in button is displayed
      expect(screen.getByRole('button', { name: /Google/ })).toBeTruthy();
    });

    it('should render Discord sign-in button', () => {
      // Given: no props
      // When: rendering SignInContent
      render(<SignInContent />);

      // Then: a Discord sign-in button is displayed
      expect(screen.getByRole('button', { name: /Discord/ })).toBeTruthy();
    });
  });

  describe('error display', () => {
    it('should not show error alert when no error prop', () => {
      // Given: no error prop
      // When: rendering SignInContent
      render(<SignInContent />);

      // Then: no alert element is rendered
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('should show error alert when error prop is provided', () => {
      // Given: an OAuthSignin error
      // When: rendering SignInContent with the error
      render(<SignInContent error="OAuthSignin" />);

      // Then: an alert element is rendered
      expect(screen.getByRole('alert')).toBeTruthy();
    });

    it('should show specific message for OAuthAccountNotLinked error', () => {
      // Given: an OAuthAccountNotLinked error
      // When: rendering SignInContent with the error
      render(<SignInContent error="OAuthAccountNotLinked" />);

      // Then: a message about using a different sign-in method is shown
      expect(screen.getByText(/別の方法/)).toBeTruthy();
    });
  });

  describe('sign-in actions', () => {
    it('should call signIn with google provider when Google button is clicked', () => {
      // Given: SignInContent is rendered
      render(<SignInContent />);

      // When: clicking the Google sign-in button
      fireEvent.click(screen.getByRole('button', { name: /Google/ }));

      // Then: signIn is called with 'google' as the provider
      expect(mockSignIn).toHaveBeenCalled();
      expect(mockSignIn.mock.calls[0][0]).toBe('google');
    });

    it('should call signIn with discord provider when Discord button is clicked', () => {
      // Given: SignInContent is rendered
      render(<SignInContent />);

      // When: clicking the Discord sign-in button
      fireEvent.click(screen.getByRole('button', { name: /Discord/ }));

      // Then: signIn is called with 'discord' as the provider
      expect(mockSignIn).toHaveBeenCalled();
      expect(mockSignIn.mock.calls[0][0]).toBe('discord');
    });

    it('should pass callbackUrl to signIn when callbackUrl prop is provided', () => {
      // Given: SignInContent with a callbackUrl
      render(<SignInContent callbackUrl="/dashboard" />);

      // When: clicking any sign-in button
      fireEvent.click(screen.getByRole('button', { name: /Google/ }));

      // Then: signIn is called with the callbackUrl in options
      expect(mockSignIn).toHaveBeenCalledWith(
        'google',
        expect.objectContaining({ callbackUrl: '/dashboard' })
      );
    });
  });
});
