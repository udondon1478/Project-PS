'use client';

import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, SearchX } from "lucide-react";

export function SearchEmptyState() {
  const { t } = useTranslation('search');

  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center text-center space-y-6">
      <div className="bg-muted/30 p-4 rounded-full">
        <SearchX className="w-12 h-12 text-muted-foreground" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{t('empty.title')}</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          {t('empty.description')}
        </p>
      </div>

      <div className="bg-card border rounded-lg p-6 max-w-lg w-full text-left space-y-4 shadow-sm">
        <h3 className="font-medium flex items-center gap-2">
          <span className="text-primary">💡</span> {t('empty.tips.title')}
        </h3>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
          <li>{t('empty.tips.reduceTags')}</li>
          <li>{t('empty.tips.removeExclusion')}</li>
          <li>{t('empty.tips.changeKeyword')}</li>
        </ul>
      </div>

      <div className="pt-4 space-y-3">
        <p className="text-sm font-medium">{t('empty.notFound')}</p>
        <Button asChild size="lg" className="gap-2">
          <Link href="/register-item">
            <PlusCircle className="w-4 h-4" />
            {t('empty.registerNew')}
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          {t('empty.community')}
        </p>
      </div>
    </div>
  );
}
