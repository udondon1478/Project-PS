# PolySeek 開発環境構築ガイド

このドキュメントは、`PolySeek` プロジェクトの開発環境をローカルマシンにセットアップするための手順を説明します。

## 1. 前提条件

開発を始める前に、以下のソフトウェアがインストールされていることを確認してください。

*   **Git**: バージョン管理システム
*   **Node.js**: v20.x 以降を推奨
*   **Docker Desktop**: データベース（PostgreSQL）の実行環境

## 2. 環境構築手順

### Step 1: リポジトリのクローン

まず、プロジェクトのリポジトリをローカルマシンにクローンします。

```bash
git clone https://github.com/udondon1478/PolySeek.git
cd PolySeek
```

### Step 2: 環境変数の設定

次に、環境変数を設定します。プロジェクトルートにある `.env.example` ファイルをコピーして `.env.local` ファイルを作成します。

```bash
cp .env.example .env.local
```

作成した `.env.local` ファイルをエディタで開き、以下の項目を設定してください。

*   `DATABASE_URL`: Prismaがデータベースに接続するためのURLです。通常は `postgresql://<user>:<password>@<host>:<port>/<database>` の形式です。
*   `POSTGRES_USER`: Dockerで起動するPostgreSQLのユーザー名です。
*   `POSTGRES_PASSWORD`: Dockerで起動するPostgreSQLのパスワードです。
*   `POSTGRES_DB`: Dockerで起動するPostgreSQLのデータベース名です。
*   `AUTH_SECRET`: NextAuth.jsがセッション情報を暗号化するために使用するシークレットキーです。以下のコマンドで生成できます。
    ```bash
    openssl rand -hex 32
    ```
*   `AUTH_GITHUB_ID`: GitHub OAuth認証用のクライアントIDです。
*   `AUTH_GITHUB_SECRET`: GitHub OAuth認証用のクライアントシークレットです。
*   `SENTRY_DSN`: Sentryのサーバーサイド監視用DSNです。Sentryのプロジェクト設定 > Client Keys (DSN) から取得できます。
*   `NEXT_PUBLIC_SENTRY_DSN`: Sentryのクライアントサイド監視用DSNです。通常は `SENTRY_DSN` と同じ値を設定します。

### Step 3: データベースの起動

Docker Composeを使用して、PostgreSQLデータベースを起動します。

```bash
docker-compose up -d
```

### Step 4: 依存関係のインストール

プロジェクトに必要なライブラリをインストールします。

```bash
npm install
```

### Step 5: データベースマイグレーション

Prisma Migrateを使用して、データベースのテーブルを作成します。

```bash
npx prisma migrate dev
```

このコマンドは、`prisma/migrations` ディレクトリにあるマイグレーションファイルをデータベースに適用し、同時にPrisma Clientを最新の状態に更新します。

### Step 6: (任意) 初期データの投入

開発用の初期データをデータベースに投入します。

```bash
npx prisma db seed
```

### Step 7: 開発サーバーの起動

すべての準備が整いました。以下のコマンドで開発サーバーを起動します。

```bash
npm run dev
```

## 3. 動作確認

開発サーバーが起動したら、Webブラウザで `http://localhost:3000` にアクセスしてください。PolySeekのトップページが表示されれば、環境構築は成功です。

## 4. 開発中の運用について

他の開発者による変更や、別の環境での作業内容をプルした場合は、`POST_PULL_STEPS.md` に記載されている手順に従って、ローカル環境を更新してください。