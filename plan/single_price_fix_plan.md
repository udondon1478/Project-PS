# 単一価格商品の価格保存問題 修正計画

## 問題概要
Booth.pmから取得した商品情報のうち、単一価格の商品を登録する際に、価格がデータベースに正しく保存されない。

## 原因
Booth.pmのSchema.orgデータでは、単一価格の商品は`offers`の`@type`が`Offer`となり`price`フィールドに価格が設定される。一方、複数価格の商品は`@type`が`AggregateOffer`となり`lowPrice`と`highPrice`フィールドに価格範囲が設定される。
現在の商品登録API (`src/app/api/items/create/route.ts`) では、リクエストボディから直接`lowPrice`と`highPrice`を取得しているため、単一価格の場合にこれらのフィールドが正しく設定されず、データベースに保存されない。

## 修正目標
単一価格の商品登録時にも、価格が正しくデータベースに保存されるようにする。

## 対象ファイル
- `src/app/api/items/create/route.ts`

## 修正内容
1.  リクエストボディから取得した`productInfo.offers`の`@type`を確認する。
2.  `@type`が`'Offer'`の場合、`productInfo.offers.price`の値を数値に変換し、その値を`lowPrice`および`highPrice`として使用する。
3.  `@type`が`'AggregateOffer'`の場合、リクエストボディから取得した`lowPrice`および`highPrice`の値を数値に変換してそのまま使用する。

## 処理フロー (Mermaid)

```mermaid
graph TD
    A[リクエスト受信] --> B{productInfo.offers['@type'] == 'Offer'?};
    B -- Yes --> C[price = parseFloat(productInfo.offers.price)];
    C --> D[lowPrice = price, highPrice = price];
    B -- No --> E[lowPrice = parseFloat(productInfo.lowPrice), highPrice = parseFloat(productInfo.highPrice)];
    D --> F[Prisma product.create 実行];
    E --> F[Prisma product.create 実行];
    F --> G[商品登録完了];
```

## 実施手順
1.  `src/app/api/items/create/route.ts` を開く。
2.  `productInfo` から `offers` オブジェクトを取得する。
3.  `offers['@type']` の値を確認する条件分岐を追加する。
4.  条件分岐内で、価格を数値に変換して `lowPrice` と `highPrice` に設定するロジックを実装する。