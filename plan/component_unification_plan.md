# コンポーネント統一計画

## 概要
現在、検索結果ページ (`src/app/search/page.tsx`) とトップページ (`src/app/page.tsx`) は、商品の表示部分で多くのコードが重複しています。これらの共通部分をコンポーネントとして抽出し、コードの重複を排除し、保守性を向上させます。

## 目的
- コードの重複を削減する。
- コンポーネントの再利用性を高める。
- コードの保守性と可読性を向上させる。

## 計画詳細

1.  **共通コンポーネントの特定と抽出:**
    *   個々の商品カードの表示部分を `components/ProductCard.tsx` という新しいコンポーネントとして抽出します。このコンポーネントは `Product` データをpropsとして受け取り、画像、タイトル、タグ、価格を表示します。いいねボタンの表示はpropsで制御できるようにします。
    *   商品カードのグリッド表示部分を `components/ProductGrid.tsx` という新しいコンポーネントとして抽出します。このコンポーネントは `Product` の配列をpropsとして受け取り、`ProductCard` をリスト表示します。
    *   重複している `PriceDisplay` コンポーネントを独立したファイル (`components/PriceDisplay.tsx`) に移動します。

2.  **既存ページの修正:**
    *   `src/app/page.tsx` は、データフェッチ（`/api/products/latest`）と「最新の商品」という見出しの表示を担当し、商品のリスト表示には新しく作成した `ProductGrid` コンポーネントを使用するように修正します。`PriceDisplay` は移動したファイルからインポートします。
    *   `src/app/search/page.tsx` は、検索パラメータの取得、タグの選択肢のフェッチ、選択状態の管理、`/api/products` へのデータフェッチ、検索結果がない場合の表示を担当し、商品のリスト表示には `ProductGrid` コンポーネントを使用するように修正します。`PriceDisplay` は移動したファイルからインポートします。

3.  **コードの整理:** 抽出・移動したコンポーネントの元の場所にある重複コードを削除します。

## 想定される成果物
- `components/ProductCard.tsx` (新規作成)
- `components/ProductGrid.tsx` (新規作成)
- `components/PriceDisplay.tsx` (新規作成、既存コードから移動)
- `src/app/page.tsx` (修正)
- `src/app/search/page.tsx` (修正)

## Mermaid 図

```mermaid
graph TD
    A[src/app/page.tsx] --> C(データ取得: /api/products/latest);
    B[src/app/search/page.tsx] --> D(データ取得: /api/products);
    B --> E(検索パラメータ処理);
    B --> F(タグフィルタリング);
    C --> G(ProductGrid コンポーネント);
    D --> G;
    G --> H(ProductCard コンポーネント);
    H --> I(PriceDisplay コンポーネント);
    subgraph 新しいコンポーネント
        G; H; I;
    end