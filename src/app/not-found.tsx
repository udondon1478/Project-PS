import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'ページが見つかりません | PolySeek',
  description: 'お探しのページは削除されたか、URLが変更された可能性があります。',
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
      <h1 className="text-6xl font-black text-primary/20">404</h1>
      <h2 className="text-2xl font-bold tracking-tight">ページが見つかりません</h2>
      <p className="text-muted-foreground max-w-[500px]">
        お探しのページは削除されたか、URLが変更された可能性があります。
        URLをご確認の上、再度お試しください。
      </p>
      <div className="mt-4">
        <Button asChild>
          <Link href="/">
            トップページへ戻る
          </Link>
        </Button>
      </div>
    </main>
  );
}
