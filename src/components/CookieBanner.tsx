"use client";

import { useCookieConsent } from '@/contexts/CookieConsentContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { initSentry } from '../../sentry.client.config';

export default function CookieBanner() {
  const { hasConsent, acceptCookies, rejectCookies, isHydrated } = useCookieConsent();

  // ハイドレーション完了前は何も表示しない（ちらつき防止）
  if (!isHydrated) {
    return null;
  }

  // 既に同意/拒否済みの場合は表示しない
  if (hasConsent !== null) {
    return null;
  }

  return (
    <section 
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      aria-live="polite"
      aria-label="Cookie同意"
      aria-describedby="cookie-banner-description"
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <p id="cookie-banner-description" className="text-sm text-muted-foreground">
              当サイトでは、サービス改善のためGoogle AnalyticsおよびSentryを使用しています。
              これらのツールはCookieやsessionStorageを使用して匿名の利用統計を収集します。
              詳細は<Link href="/privacy" className="text-primary hover:underline">プライバシーポリシー</Link>をご覧ください。
            </p>
          </div>
          <div className="flex flex-shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={rejectCookies}
              aria-label="Cookieを拒否する"
            >
              拒否する
            </Button>
            <Button
              size="sm"
              onClick={() => {
                acceptCookies();
                initSentry();
              }}
              aria-label="Cookieに同意する"
            >
              同意する
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
