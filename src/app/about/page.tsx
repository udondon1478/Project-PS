import type { Metadata } from 'next';
import { BASE_URL } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'PolySeekについて',
  description: 'PolySeekは、VRChat向けアセットの検索性を向上させるための非公式データベース・検索エンジンです。',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: `${BASE_URL}/about`,
  },
};

export default function AboutPage() {
  return (
    <div className="container mx-auto p-8 prose dark:prose-invert max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">PolySeekについて</h1>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">PolySeekとは</h2>
        <p>
          PolySeek（ポリシーク）は、VRChat向けのアバターや衣装、アクセサリーなどの3Dアセットを、より直感的かつ詳細に検索できるプラットフォームです。
        </p>
        <p>
          「もっとこだわった条件で探したい」「好みの衣装を見つけたい」というVRChatユーザーの声に応え、BOOTH等で公開されているアセット情報を集約し、独自のタグ付けシステムと高度な検索機能を提供しています。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">主な機能</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>高度なタグ検索:</strong> ユーザー参加型のタグ編集により、色、スタイル、対応アバターなど、細かい条件での検索が可能です。
          </li>
          <li>
            <strong>マイナス検索:</strong> 特定の要素を除外して検索することで、目的のアイテムに素早くたどり着けます。
          </li>
          <li>
            <strong>お気に入り・管理機能:</strong> 気になった商品を「欲しいものリスト」に追加したり、既に持っている商品を「所有済み」として管理できます。
          </li>
        </ul>
      </section>

      <section className="mb-8 bg-muted p-6 rounded-lg">
        <h2 className="text-lg font-bold mb-2">免責事項</h2>
        <p className="text-sm text-muted-foreground">
          PolySeekは、非公式のファンサイト/ツールであり、ピクシブ株式会社（BOOTH）やメタバースプラットフォーム運営会社とは一切関係ありません。
        </p>
        <p className="text-sm text-muted-foreground">
          掲載されている商品情報の権利は、各販売者および配信元プラットフォームに帰属します。
        </p>
      </section>
    </div>
  );
}
