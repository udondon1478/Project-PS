# Booth.pm 商品登録機能 実装計画

## プロジェクト概要
PolySeekは、VRChat向けBooth.pm商品をタグベースで検索できるWebアプリケーションです。本計画は、このプロジェクトにBooth.pmの商品登録機能を追加するためのものです。

## タスクの目的
Booth.pmの商品URLを入力することで、ページから商品情報を自動取得し、登録したユーザーIDと紐づけてデータベースに保存する機能の最小限の実装を行います。

## 実装計画（修正版）

1.  **Booth.pm URLのバリデーション**: 入力されたURLがBooth.pmの正しい形式（`https://booth.pm/ja/items/${productId}` または `https://booth.pm/en/items/${productId}`）であるかを確認する処理を実装します。
2.  **HTMLコンテンツの取得**: サーバーサイドでHTTPクライアント（例: `node-fetch`）を使用して、Booth.pmの商品ページのHTMLコンテンツを取得します。
3.  **Schema.org JSONデータの抽出と解析**: 取得したHTMLコンテンツをHTMLパーサー（例: `cheerio`）で解析し、`<script type="application/ld+json">`タグの内容を抽出します。抽出したJSON文字列をパースして商品情報を取得します。
4.  **不足情報の補完（必要な場合）**: Schema.org JSONデータで不足している情報（例: 複数の商品画像URL）があれば、HTMLパーサーを使用してHTML本文中の該当要素（例: `<img>`タグ）から情報を抽出します。
5.  **APIエンドポイントの修正**: 既存の [`src/app/api/items/route.ts`](src/app/api/items/route.ts) のPOSTエンドポイントを修正し、以下の処理を実装します。
    *   リクエストボディからBooth.pmのURLを受け取ります。
    *   URLのバリデーションを行います。
    *   HTTPクライアントとHTMLパーサーを使用して商品情報を抽出します。
    *   抽出した商品情報とAuth.jsで取得したログインユーザーIDを紐づけて、Prismaを使用してデータベースに保存します。
    *   保存結果をレスポンスとして返します。
6.  **フロントエンドの実装（最小限）**: 商品URLを入力するためのフォームを持つページを作成し、入力されたURLをPOSTリクエストとして `/api/items` エンドポイントに送信する処理を実装します。

## 使用する技術要素
*   HTTPクライアント (例: `node-fetch`)
*   HTMLパーサー (例: `cheerio`)
*   Prisma (データベース操作)
*   Auth.js (ユーザー認証)
*   Next.js (APIエンドポイント、フロントエンド)

## 計画フロー

```mermaid
graph TD
    A[ユーザーがBooth.pm URLを入力] --> B{URLのバリデーション};
    B --> |不正なURL| C[エラーメッセージ表示];
    B --> |正しいURL| D[サーバーサイドでHTML取得];
    D --> E[HTMLパーサーでJSON抽出・解析];
    E --> F{必要な情報が揃っているか};
    F --> |揃っている| H[APIエンドポイントでDB保存];
    F --> |不足あり| G[HTMLパーサーで情報補完];
    G --> H[APIエンドpointでDB保存];
    H --> I[商品登録完了];
    I --> J[ユーザーに結果表示];