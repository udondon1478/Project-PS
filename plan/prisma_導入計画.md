# Prisma導入計画

## 概要

Context7を用いてPrismaを導入し、Docker上のPostgreSQLを制御できるようにする。

## 手順

1.  **情報収集:**
    *   Context7を用いてPrismaとPostgreSQLに関する最新のドキュメントを取得する。
    *   既存のプロジェクト構成を確認し、Prismaを導入する際の最適なディレクトリ構造を検討する。
    *   Dockerに関する知識をContext7で補強する。
2.  **計画:**
    *   Prismaのスキーマ定義を作成する。
    *   Docker Composeファイルを作成し、PostgreSQLコンテナを定義する。
    *   Next.jsアプリケーションにPrismaクライアントを統合する。
    *   必要な環境変数を設定する。
3.  **実装:**
    *   上記計画に基づいて、必要なファイルを作成・編集する。
    *   Dockerコンテナを起動し、PrismaクライアントがPostgreSQLに接続できることを確認する。
4.  **テスト:**
    *   Prismaクライアントを使用して、データベースへのCRUD操作をテストする。
    *   Next.jsアプリケーションからデータベースへのアクセスをテストする。
5.  **完了:**
    *   動作確認後、変更をコミットする。

## 計画図

```mermaid
graph LR
    A[情報収集] --> B{Context7でドキュメント取得};
    B -- Prismaのドキュメント --> C[Prismaスキーマ定義];
    B -- PostgreSQLのドキュメント --> D[Docker Composeファイル作成];
    B -- Next.jsのドキュメント --> E[Prismaクライアント統合];
    C --> F[環境変数設定];
    D --> F;
    E --> F;
    F --> G[実装];
    G --> H[Dockerコンテナ起動];
    H --> I[テスト];
    I --> J[完了];