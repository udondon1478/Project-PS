# PolySeek

> BOOTHのVRChatアバター・アクセサリをコミュニティタグで検索するプラットフォーム

## サービスについて

**PolySeek** は、[BOOTH](https://booth.pm/) で販売されているVRChatアバターやアクセサリに対して、ユーザーコミュニティが自由にタグ付けできる検索プラットフォームです。

BOOTHの公式カテゴリや検索だけでは見つけにくい商品を、コミュニティが作成した詳細なタグで横断的に検索できるようにすることで、クリエイターとユーザーの両方を支援します。

**サービスURL**: [https://polyseek.jp](https://polyseek.jp)

## スクリーンショット

<!-- TODO: 実際のスクリーンショットに差し替え -->

| トップページ | 検索結果 | 商品詳細 |
|:---:|:---:|:---:|
| *準備中* | *準備中* | *準備中* |

## 主な機能

- **コミュニティタグシステム** - ユーザーが自由にタグを作成・投票して商品を分類
- **高度な検索・フィルタリング** - タグの組み合わせや価格帯、対応アバターなど多彩な条件で検索
- **タグの階層・エイリアス・含意関係** - タグ同士の関係性を管理し、検索精度を向上
- **AI自動タグ提案** - 商品情報からAIが適切なタグを自動提案
- **BOOTHスクレイピング** - BOOTH商品情報の自動取得・更新
- **管理者ダッシュボード** - タグ管理、ユーザー管理、スクレイピング制御などの管理機能
- **多言語対応** - 日本語・英語のUI切り替え

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 16 / React 19 / TypeScript |
| データベース | PostgreSQL / Prisma ORM |
| 認証 | NextAuth.js (GitHub, Google, Discord OAuth) |
| UI | Tailwind CSS 4 / Radix UI |
| 監視 | Sentry |
| テスト | Vitest / Playwright |
| CI/CD | GitHub Actions |
| ホスティング | VPS (PM2) |

## 開発を始める

詳しいセットアップ手順は [Wiki: 開発環境セットアップ](../../wiki/開発環境セットアップ) を参照してください。

### 前提条件

- Node.js 20+
- PostgreSQL (Docker推奨)
- Docker Desktop

### クイックスタート

```bash
git clone https://github.com/udondon1478/Project-PS.git
cd Project-PS
cp .env.example .env.local  # 環境変数を設定
docker-compose up -d         # DB起動
npm install
npx prisma migrate dev
npm run dev
```

## 関連リンク

- [Wiki](../../wiki) - 開発・運用ドキュメント
- [Projects](https://github.com/udondon1478/Project-PS/projects) - 開発Kanbanボード
- [Discussions](https://github.com/udondon1478/Project-PS/discussions) - お知らせ・議論

## ライセンス

All Rights Reserved. 詳細は [LICENSE](./LICENSE) を参照してください。
