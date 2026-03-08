import type { Metadata } from 'next';
import { NotFoundContent } from '@/components/NotFoundContent';

export const metadata: Metadata = {
  title: 'ページが見つかりません | PolySeek',
  description: 'お探しのページは削除されたか、URLが変更された可能性があります。',
};

export default function NotFound() {
  return <NotFoundContent />;
}
