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

const SIGNIN_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    'このメールアドレスは既に別の方法で登録されています。元の方法でログインしてください。',
  OAuthSignin: 'OAuth認証の開始に失敗しました。もう一度お試しください。',
  OAuthCallback: 'OAuth認証の処理中にエラーが発生しました。もう一度お試しください。',
  OAuthCreateAccount: 'アカウントの作成に失敗しました。もう一度お試しください。',
  Callback: '認証コールバックでエラーが発生しました。もう一度お試しください。',
  AccessDenied: 'アクセスが拒否されました。',
  SessionRequired: 'この操作にはログインが必要です。',
};

const DEFAULT_SIGNIN_ERROR = '認証中にエラーが発生しました。もう一度お試しください。';

type Props = {
  error?: string;
  callbackUrl?: string;
};

export default function SignInContent({ error, callbackUrl }: Props) {
  const handleSignIn = (provider: 'google' | 'discord') => {
    signIn(provider, callbackUrl ? { callbackUrl } : undefined);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="leading-none font-semibold">ログイン</h1>
          <CardDescription>
            以下のいずれかの方法でログインしてください。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {SIGNIN_ERROR_MESSAGES[error] ?? DEFAULT_SIGNIN_ERROR}
              </AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col space-y-3">
            <Button onClick={() => handleSignIn('google')}>
              Googleでログイン
            </Button>
            <Button onClick={() => handleSignIn('discord')}>
              Discordでログイン
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
