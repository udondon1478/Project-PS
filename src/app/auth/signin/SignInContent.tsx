'use client';

import { signIn } from 'next-auth/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Props = {
  error?: string;
  callbackUrl?: string;
};

export default function SignInContent({ error, callbackUrl }: Props) {
  const { t } = useTranslation('auth');

  const handleSignIn = (provider: 'google' | 'discord') => {
    signIn(provider, callbackUrl ? { callbackUrl } : undefined);
  };

  const errorMessage = error ? t(`errors.${error}`, { defaultValue: t('errors.default') }) : '';

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="leading-none font-semibold">{t('dialog.login.title')}</h1>
          <CardDescription>
            {t('dialog.login.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col space-y-3">
            <Button onClick={() => handleSignIn('google')}>
              {t('provider.google.login')}
            </Button>
            <Button onClick={() => handleSignIn('discord')}>
              {t('provider.discord.login')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
