# 検索結果表示ページの作成計画 (データベース連携 & トップページデザイン準拠)

## 概要
タグによる商品フィルタリング機能を備えた検索結果表示ページを作成する。APIはデータベースからデータを取得し、フロントエンドは既存のトップページのデザインに準拠する。

## 計画詳細

1.  **APIルートファイルの作成**
    *   ファイルパス: [`src/app/api/products/route.ts`](src/app/api/products/route.ts)
    *   内容:
        *   Prismaクライアントをインポートし、データベースに接続する。
        *   リクエストからクエリパラメータ `tags` を取得し、タグの配列にパースする。
        *   Prismaを使用して、`tags` パラメータで指定されたすべてのタグを持つ商品をデータベースから検索する。
        *   検索時には、商品情報（ID, title, lowPrice）に加えて、関連するタグ (`ProductTag` モデルを介して) とメイン画像 (`ProductImage` モデルで `isMain: true` のもの) を含めるように関連データを取得する。
        *   取得したデータを、フロントエンドの `Product` インターフェースに合う形式に整形する。
        *   整形した商品データの配列をJSON形式で返す。

2.  **検索結果表示ページのファイルの配置と修正**
    *   ファイルパス: [`src/app/search/page.tsx`](src/app/search/page.tsx)
    *   内容:
        *   提供された検索結果表示ページのコードをベースにする。
        *   `Product` インターフェースを [`src/app/page.tsx`](src/app/page.tsx) のものに合わせる。
        *   `next/navigation` から `useSearchParams` をインポートし、URLから `tags` クエリパラメータを取得する。
        *   `useEffect` フック内で `/api/products?tags=${searchTerm}` を呼び出し、商品データをフェッチする。
        *   データのローディング中やエラー発生時の表示を実装する（[`src/app/page.tsx`](src/app/page.tsx) を参考に）。
        *   商品のリスト表示部分のJSX構造とTailwind CSSクラスを [`src/app/page.tsx`](src/app/page.tsx) の商品グリッド部分と一致させる。
        *   画像の表示には `next/image` を使用し、[`src/app/page.tsx`](src/app/page.tsx) の画像表示ロジックを適用する（メイン画像がない場合のプレースホルダーも含む）。
        *   商品タイトル、タグ、価格 (`lowPrice`) の表示形式を [`src/app/page.tsx`](src/app/page.tsx) に合わせる。
        *   提供されたコードに含まれる「いいね」ボタンは削除する。
        *   商品詳細ページへのリンク (`/products/${product.id}`) は維持する。
        *   ページ上部に「検索キーワード: [searchTerm]」のような表示を追加する。

3.  **コードの確認と調整**
    *   [`src/app/search/page.tsx`](src/app/search/page.tsx) と [`src/app/api/products/route.ts`](src/app/api/products/route.ts) 間でデータのやり取りが正しく行われるか確認する。
    *   APIから返されるデータの構造がフロントエンドの期待する形式と一致しているか確認し、必要に応じて変換処理を行う。
    *   UIの表示崩れがないか確認し、Tailwind CSSクラスを調整する。

## 完了基準
*   `/search?tags=タグ1,タグ2` のようなURLでアクセスした際に、指定されたタグをすべて含む商品がデータベースから取得され、トップページと同じデザインで一覧表示されること。
*   商品カードの画像、タイトル、タグ、価格が正しく表示されること。
*   商品タイトルをクリックすると、対応する商品詳細ページへのリンクになっていること。