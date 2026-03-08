'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export function NotFoundContent() {
  const { t } = useTranslation();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
      <p className="text-6xl font-black text-primary/20" aria-hidden="true">404</p>
      <h1 className="text-2xl font-bold tracking-tight">{t('notFound.title')}</h1>
      <p className="text-muted-foreground max-w-[500px]">
        {t('notFound.description')}
      </p>
      <div className="mt-4">
        <Button asChild>
          <Link href="/">
            {t('notFound.backToHome')}
          </Link>
        </Button>
      </div>
    </main>
  );
}
