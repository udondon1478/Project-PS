import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: '認証エラー | PolySeek',
};

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  Configuration: {
    title: 'サーバー設定エラー',
    description: 'サーバーの認証設定に問題があります。管理者にお問い合わせください。',
  },
  AccessDenied: {
    title: 'アクセスが拒否されました',
    description: 'このリソースへのアクセス権がありません。',
  },
  Verification: {
    title: '認証リンクの有効期限切れ',
    description: '認証リンクの有効期限が切れました。もう一度お試しください。',
  },
};

const DEFAULT_ERROR = {
  title: '認証エラー',
  description: '認証中にエラーが発生しました。もう一度お試しください。',
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { title, description } = ERROR_MESSAGES[error ?? ''] ?? DEFAULT_ERROR;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
      <div className="p-3 rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-10 w-10" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground max-w-[500px]">{description}</p>
      <div className="mt-4 flex gap-3">
        {error === 'AccessDenied' && (
          <Button asChild variant="outline">
            <Link href="/auth/signin">再度ログインする</Link>
          </Button>
        )}
        <Button asChild>
          <Link href="/">トップページへ戻る</Link>
        </Button>
      </div>
    </main>
  );
}
