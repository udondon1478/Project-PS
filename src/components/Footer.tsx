'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { XIcon, DiscordIcon } from '@/components/SocialIcons';
import { DISCORD_INVITE_URL, X_ACCOUNT_URL } from '@/lib/constants';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation('footer');
  const { t: tCommon } = useTranslation();
  return (
    <footer className="border-t bg-background py-8 md:py-0 pb-28 lg:pb-8">
      <div className="container flex flex-col items-center justify-between gap-4 px-4 md:h-24 md:flex-row">
        <div className="flex flex-col items-center md:items-start order-2 md:order-1">
          <p className="text-center text-xs text-muted-foreground md:text-left mb-2">
            {t('disclaimer.unofficial')}<br className="md:hidden" />{t('disclaimer.noAffiliation')}
          </p>
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            {t('copyright')}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 items-center order-1 md:order-2">
          <Link href="/about" className="text-sm font-medium hover:underline underline-offset-4 text-muted-foreground">
            {t('links.about')}
          </Link>
          <Link href="/faq" className="text-sm font-medium hover:underline underline-offset-4 text-muted-foreground">
            {t('links.faq')}
          </Link>
          <Link href="/terms" className="text-sm font-medium hover:underline underline-offset-4 text-muted-foreground">
            {t('links.terms')}
          </Link>
          <Link href="/privacy" className="text-sm font-medium hover:underline underline-offset-4 text-muted-foreground">
            {t('links.privacy')}
          </Link>
          <a
            href="https://forms.gle/PVdUpKCM4ZgMyK5fA"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium hover:underline underline-offset-4 flex items-center gap-1 text-muted-foreground"
          >
            {t('links.contact')}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>

          <div className="flex items-center gap-3 pl-4 ml-2 border-l border-gray-200 dark:border-gray-700">
            <a
              href={X_ACCOUNT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={tCommon('aria.x')}
            >
              <XIcon className="h-5 w-5" />
            </a>
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-[#5865F2] transition-colors"
              aria-label={tCommon('aria.discord')}
            >
              <DiscordIcon className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
