'use client';

import Link from 'next/link';
import React from 'react';
import { useTranslation } from 'react-i18next';

type AuthDialogNoticeProps = {
  onClose: () => void;
};

export const AuthDialogNotice: React.FC<AuthDialogNoticeProps> = ({ onClose }) => {
  const { t } = useTranslation('auth');

  return (
    <p className="text-xs text-muted-foreground mt-2">
      ※ {t('notice.oauthOnly')}
      <Link href="/faq#oauth" className="underline ml-1" onClick={onClose}>{t('notice.details')}</Link>
    </p>
  );
};
