import { describe, it, expect, vi } from 'vitest';

vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: '--font-geist-sans', className: 'mock-geist' }),
  Geist_Mono: () => ({ variable: '--font-geist-mono', className: 'mock-geist-mono' }),
}));
vi.mock('next-auth/react', () => ({ SessionProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/components/Header', () => ({ default: () => null }));
vi.mock('@/components/theme-provider', () => ({ ThemeProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/components/ui/sonner', () => ({ Toaster: () => null }));
vi.mock('@/components/AuthGuard', () => ({ default: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/components/MainLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/components/Footer', () => ({ default: () => null }));
vi.mock('@/contexts/CookieConsentContext', () => ({ CookieConsentProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/components/CookieBanner', () => ({ default: () => null }));
vi.mock('@/components/AnalyticsLoader', () => ({ default: () => null }));

import { metadata } from '../layout';
import { BASE_URL } from '@/lib/constants';

const EXPECTED_DESCRIPTION =
  'PolySeekは、VRChat向けの3Dアバターやアクセサリーをタグベースで検索できるサービスです。一つの商品に対し、みんなでタグを付与していくことで検索性が向上します。';
const OG_IMAGE_PATH = '/images/PolySeek_icon_and_typo_1200.png';

describe('Root layout metadata', () => {
  describe('description', () => {
    it('has site introduction text for SNS preview', () => {
      expect(metadata.description).toBe(EXPECTED_DESCRIPTION);
    });
  });

  describe('openGraph', () => {
    it('is defined', () => {
      expect(metadata.openGraph).toBeDefined();
    });

    it('has title set to PolySeek', () => {
      expect(metadata.openGraph).toHaveProperty('title', 'PolySeek');
    });

    it('has description matching site description', () => {
      expect(metadata.openGraph).toHaveProperty('description', EXPECTED_DESCRIPTION);
    });

    it('has OG image path configured', () => {
      expect(metadata.openGraph).toHaveProperty('images', [OG_IMAGE_PATH]);
    });

    it('has type set to website', () => {
      expect(metadata.openGraph).toHaveProperty('type', 'website');
    });

    it('has url set to BASE_URL', () => {
      expect(metadata.openGraph).toHaveProperty('url', BASE_URL);
    });

    it('has siteName set to PolySeek', () => {
      expect(metadata.openGraph).toHaveProperty('siteName', 'PolySeek');
    });
  });

  describe('twitter', () => {
    it('is defined', () => {
      expect(metadata.twitter).toBeDefined();
    });

    it('has card set to summary_large_image', () => {
      expect(metadata.twitter).toHaveProperty('card', 'summary_large_image');
    });

    it('has title set to PolySeek', () => {
      expect(metadata.twitter).toHaveProperty('title', 'PolySeek');
    });

    it('has description matching site description', () => {
      expect(metadata.twitter).toHaveProperty('description', EXPECTED_DESCRIPTION);
    });

    it('has image path configured', () => {
      expect(metadata.twitter).toHaveProperty('images', [OG_IMAGE_PATH]);
    });
  });

  describe('preserved existing fields', () => {
    it('preserves metadataBase', () => {
      expect(metadata.metadataBase).toEqual(new URL(BASE_URL));
    });

    it('preserves title template', () => {
      expect(metadata.title).toEqual({
        template: '%s - PolySeek',
        default: 'PolySeek',
      });
    });

    it('preserves icons configuration', () => {
      expect(metadata.icons).toBeDefined();
    });

    it('preserves alternates canonical', () => {
      expect(metadata.alternates).toEqual({ canonical: BASE_URL });
    });
  });
});
