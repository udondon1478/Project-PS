# 商品価格情報のスキーマ変更と関連コード修正計画

## 概要
現在のデータベーススキーマでは商品の価格を単一のフィールド (`price`) で保存していますが、これを最低金額 (`lowPrice`) と最高金額 (`highPrice`) で保存できるように変更します。Booth.pm の Schema.org データには価格帯情報 (`lowPrice`, `highPrice`) が含まれていることが確認されています。

## 計画詳細

1.  **Prisma スキーマの変更**:
    *   ファイル: [`prisma/schema.prisma`](prisma/schema.prisma)
    *   内容: `Product` モデルから `price` フィールドを削除し、`lowPrice` (Float型) と `highPrice` (Float型) フィールドを追加します。

    ```mermaid
    graph TD
        A[Product Model] --> B(price: Float);
        A --> C(lowPrice: Float);
        A --> D(highPrice: Float);
        B -- 削除 --> A;
    ```

2.  **Prisma マイグレーションの実行**:
    *   スキーマの変更をデータベースに適用するためのマイグレーションファイルを生成し、実行します。

3.  **商品作成 API の修正**:
    *   ファイル: [`src/app/api/items/create/route.ts`](src/app/api/items/create/route.ts)
    *   内容: リクエストボディから `lowPrice` と `highPrice` を受け取るように変更します。Prisma の `create` 処理で、`price` の代わりに `lowPrice` と `highPrice` を保存するように変更します。

4.  **商品更新 API の修正**:
    *   ファイル: [`src/app/api/items/update/route.ts`](src/app/api/items/update/route.ts)
    *   内容: Booth.pm から取得した Schema.org データから `offers.lowPrice` と `offers.highPrice` を抽出するように変更します。Prisma の `update` 処理で、`price` の代わりに抽出した `lowPrice` と `highPrice` を更新するように変更します。

5.  **商品情報取得 API の修正 (必要に応じて)**:
    *   ファイル: [`src/app/api/items/route.ts`](src/app/api/items/route.ts) など
    *   内容: `price` フィールドを参照している箇所があれば、`lowPrice` や `highPrice` を参照するように修正します。

6.  **フロントエンドコードの修正 (必要に応じて)**:
    *   ファイル: [`src/app/register-item/page.tsx`](src/app/register-item/page.tsx) など
    *   内容: 商品情報表示に関わるコードで、`price` を表示している箇所があれば、`lowPrice` や `highPrice` を表示するように修正します。

## 今後のステップ
この計画に基づき、各ファイルを修正し、データベーススキーマの変更を適用します。