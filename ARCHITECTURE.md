# アーキテクチャ概要

PolySeek プロジェクトのコードベース構造と主要な設計判断について解説します。

## ディレクトリ構造

このプロジェクトは Next.js (App Router) の標準的な構成に従っています。

```
.
├── src/
│   ├── app/                # App Router のページコンポーネントと API ルート
│   │   ├── api/            # バックエンド API エンドポイント
│   │   ├── (auth)/         # 認証が必要なページグループ
│   │   └── ...
│   ├── components/         # 再利用可能な UI コンポーネント
│   │   ├── ui/             # shadcn/ui ベースの基本コンポーネント (ボタンなど)
│   │   └── ...
│   ├── lib/                # ユーティリティ関数、ライブラリの設定 (auth.ts, prisma.tsなど)
│   ├── types/              # TypeScript の型定義
│   └── hooks/              # カスタム React Hooks
├── prisma/                 # Prisma ORM 関連
│   ├── schema.prisma       # データベーススキーマ定義
│   └── migrations/         # マイグレーション履歴
├── public/                 # 静的ファイル (画像など)
├── e2e/                    # Playwright による E2E テスト
├── documentation/          # ドキュメント (本ディレクトリ)
└── ...設定ファイル群 (package.json, tailwind.config.ts, etc.)
```

## データモデル (Prisma Schema)

主要なデータモデルは以下の通りです。詳細は `prisma/schema.prisma` を参照してください。

- **Product**: 商品情報。BOOTH上のアイテムを表します。
- **Tag**: 商品に付与されるタグ。階層構造やカテゴリを持ちます。
- **User**: ユーザー情報。
- **Like / Ownership**: ユーザーと商品の関係（いいね、所有）。

## 主要コンポーネント設計

### 検索システム
- **`src/app/search/page.tsx`**: 検索、フィルタリングを行うメインページ。
- **Server Components**: 検索結果の初期取得はサーバーサイドで行い、SEOとパフォーマンスを最適化しています。

### 認証 (Auth.js)
- GitHub アカウントを使用した OAuth 認証を実装しています。
- セッション管理には `next-auth` (v5 beta) を使用。

## スタイル設計
- **Tailwind CSS**: ユーティリティファーストなスタイリング。
- **shadcn/ui**: Radix UI をベースにしたアクセシブルなコンポーネント集を採用。
- **Dark Mode**: `next-themes` によるダークモード対応。
