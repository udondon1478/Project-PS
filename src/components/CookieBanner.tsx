"use client";

import { useCookieConsent } from '@/contexts/CookieConsentContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { initSentry } from '../../sentry.client.config';
import { Trans, useTranslation } from 'react-i18next';

export default function CookieBanner() {
  const { hasConsent, acceptCookies, rejectCookies, isHydrated } = useCookieConsent();
  const { t } = useTranslation();

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
      aria-label={t('cookie.consent')}
      aria-describedby="cookie-banner-description"
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <p id="cookie-banner-description" className="text-sm text-muted-foreground">
              {t('cookie.description')}
              <Trans i18nKey="cookie.privacyNote" components={{ link: <Link href="/privacy" className="text-primary hover:underline" /> }} />
            </p>
          </div>
          <div className="flex flex-shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={rejectCookies}
              aria-label={t('cookie.rejectLabel')}
            >
              {t('cookie.reject')}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                acceptCookies();
                initSentry();
              }}
              aria-label={t('cookie.acceptLabel')}
            >
              {t('cookie.accept')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
