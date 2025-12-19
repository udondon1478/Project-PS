import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'よくある質問 - PolySeek',
  description: 'PolySeekの使い方やよくある質問について説明します。',
};

export default function FAQPage() {
  return (
    <div className="container mx-auto p-8 prose dark:prose-invert max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">よくある質問・使い方</h1>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">タグ検索について</h2>
        <p className="mb-4">
          PolySeekでは、タグを使用した柔軟な検索が可能です。
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>
            <strong>AND検索:</strong> 複数のタグを半角スペース区切りで入力すると、すべてのタグを含む商品を検索できます。
            <br />
            <span className="text-sm text-muted-foreground">例: 「アバター 衣装」 → 「アバター」かつ「衣装」が含まれる商品</span>
          </li>
          <li>
            <strong>オートコンプリート:</strong> 検索ボックスに入力すると、PolySeek上に登録されているタグの候補が表示されます。候補から選択することで、正確なタグで検索できます。
          </li>
          <li>
            <strong>タグバッジ:</strong> 検索ボックスの下に表示されるタグバッジをクリックすることで、そのタグを検索条件から削除したり、否定検索に切り替えたりできます。
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">マイナス検索（除外検索）</h2>
        <p className="mb-4">
          特定のタグを含まない商品を検索したい場合は、タグの前に「-（半角マイナス）」を付けて検索します。
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>
            <strong>除外検索の入力:</strong> 検索ボックスで「-」に続けてタグ名を入力するか、選択済みのタグバッジをもう一度クリックして赤色（除外状態）にします。
            <br />
            <span className="text-sm text-muted-foreground">例: 「アバター -武器」 → 「アバター」を含み、「武器」を含まない商品</span>
          </li>
          <li>
            <strong>活用例:</strong> 特定のジャンルを除外したい場合や、すでに持っているアバターの専用衣装以外を探したい場合などに便利です。
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">商品登録について</h2>
        <p className="mb-4">
          BOOTHの商品ページのURLを入力して、簡単に商品をPolySeek上に登録できます。
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>
            <strong>自動データ取得:</strong> 商品URLを入力すると、タイトル、価格、サムネイル画像などの基本情報をBOOTHから自動的に取得します。
          </li>
          <li>
            <strong>必須項目:</strong>
            <ul className="list-disc pl-6 mt-2">
              <li>対象年齢（全年齢 / R-15 / R-18）</li>
              <li>カテゴリ（3Dモデル / 衣装 / テクスチャ など）</li>
            </ul>
          </li>
          <li>
            <strong>任意項目:</strong>
            <ul className="list-disc pl-6 mt-2">
              <li>特徴タグ（Modular Avatar対応、Quest対応など）</li>
              <li>カスタムタグ（ユーザーが自由に入力できるタグ）</li>
            </ul>
          </li>
          <li>
            <strong>確認ステップ:</strong> 取得した情報と入力したタグを確認し、「登録」ボタンを押すことで登録が完了します。
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">セーフサーチ機能</h2>
        <p className="mb-4">
          未成年者や、公共の場で閲覧する場合などに配慮し、成人向けコンテンツを非表示にする機能があります。
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>
            <strong>デフォルト設定:</strong> 初期状態ではセーフサーチが「有効」になっており、対象年齢がR-18として登録された商品は検索結果に表示されません。
          </li>
          <li>
            <strong>設定の変更:</strong> ログインユーザーは、プロフィール設定からセーフサーチの有効/無効を切り替えることができます。
          </li>
        </ul>
      </section>
    </div>
  );
}
