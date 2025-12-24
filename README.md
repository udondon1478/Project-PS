# PolySeek

**PolySeek** は、VRChat向けのアイテム検索サービスです。
BOOTH上の膨大な3Dモデルやアセットの中から、ユーザーが求めるアイテムを効率的に見つけ出すための高度な検索機能と、管理しやすいカタログを提供します。

## 🌟 主な機能

- **高度な検索機能**: カテゴリ、タグ、価格帯などによる絞り込み検索
- **効率的なタグ管理**: 階層化されたタグシステムによる直感的な分類
- **ユーザーフレンドリーなUI**: モダンで洗練されたデザインによる快適なユーザー体験
- **レスポンシブ対応**: デスクトップ、モバイル両方で快適に利用可能

## 🛠️ 技術スタック

このプロジェクトは最新のウェブ技術を使用して構築されています。

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Testing**: [Vitest](https://vitest.dev/), [Playwright](https://playwright.dev/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) (Auth.js)

## 🚀 開発を始める (Getting Started)

開発環境のセットアップ手順については、以下のドキュメントを参照してください。

👉 [**開発環境構築ガイド (DEVELOPMENT_SETUP.md)**](./DEVELOPMENT_SETUP.md)

### クイックスタート

```bash
# 依存関係のインストール
npm install

# データベースの起動
docker-compose up -d

# 開発サーバーの起動
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いて確認してください。

## 📖 ドキュメント

- [**デプロイガイド (DEPLOY.md)**](./DEPLOY.md): 本番環境へのデプロイ手順
- [**アーキテクチャ概要 (ARCHITECTURE.md)**](./ARCHITECTURE.md): プロジェクト構成と設計
- [**プルリクエスト後の手順 (POST_PULL_STEPS.md)**](./POST_PULL_STEPS.md): ローカル環境の更新手順

## 📄 ライセンス

[MIT License](LICENSE)
