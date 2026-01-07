import type { Metadata } from 'next';
import { GuidelinesContent } from './GuidelinesContent';

export const metadata: Metadata = {
  title: 'タグ付けガイドライン | PolySeek',
  description: '商品に適切なタグを付与するための詳細なガイドライン。レーティング判定フローチャート、タグカテゴリ、VRChatアバター向けガイドライン、ベストプラクティスを掲載しています。',
  keywords: ['タグ付け', 'ガイドライン', 'レーティング', 'VRChat', 'アバター', '3Dモデル', 'タグカテゴリ'],
  openGraph: {
    title: 'タグ付けガイドライン | PolySeek',
    description: '商品に適切なタグを付与するための詳細なガイドライン',
    type: 'website',
  },
};

export default function GuidelinesPage() {
  return <GuidelinesContent />;
}
