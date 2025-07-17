# PolySeek 継続的デプロイメント（更新デプロイ）計画

## 概要
このドキュメントは、PolySeekアプリケーションの開発環境での変更を、OCIのUbuntuインスタンスにデプロイされた本番環境に適用するための継続的デプロイメント（更新デプロイ）プロセスを記述します。

## 継続的デプロイメント（更新デプロイ）のプロセス

開発環境で変更を加えたコードを本番環境に適用するには、以下の手順を実行します。

```mermaid
graph TD
    A[開発環境での変更をコミットし、プッシュ] --> B{本番サーバーにSSH接続};
    B --> C[Gitリポジトリの更新];
    C --> D{依存関係の更新 (必要であれば)};
    D --> E[Next.jsアプリケーションの再ビルド];
    E --> F{データベースマイグレーションの適用 (必要であれば)};
    F --> G[PM2でアプリケーションを再起動];
    G --> H[完了];
```

1.  **開発環境での変更をコミットし、プッシュ**:
    開発環境でコードの変更が完了したら、Gitで変更をコミットし、リモートリポジトリ（GitHubなど）にプッシュします。
    ```bash
    git add .
    git commit -m "feat: [変更内容の概要]" # commit_rule.md に従う
    git push origin [現在のブランチ名]
    ```

2.  **本番サーバーにSSH接続**:
    本番環境のVPSにSSHで接続します。
    ```bash
    ssh [ユーザー名]@[VPSのIPアドレスまたはドメイン名]
    ```

3.  **Gitリポジトリの更新**:
    アプリケーションのディレクトリに移動し、最新のコードをプルします。
    ```bash
    cd /home/ubuntu/polyseek # アプリケーションのルートディレクトリ
    git pull origin [デプロイに使用しているブランチ名, 例: main または production]
    ```

4.  **依存関係の更新 (必要であれば)**:
    `package.json`に変更（新しいパッケージの追加や既存パッケージのバージョン変更など）があった場合は、依存関係を更新します。
    ```bash
    npm install
    ```

5.  **Next.jsアプリケーションの再ビルド**:
    最新のコードでNext.jsアプリケーションを再ビルドします。
    ```bash
    npm run build
    ```

6.  **データベースマイグレーションの適用 (必要であれば)**:
    Prismaスキーマに変更があった場合（新しいモデルの追加、既存モデルの変更など）、データベースマイグレーションを適用します。
    ```bash
    npx prisma migrate deploy
    ```

7.  **PM2でアプリケーションを再起動**:
    PM2を使用してアプリケーションを再起動し、新しいコードとビルドを反映させます。
    ```bash
    pm2 restart polyseek-app # アプリケーション名
    ```

## OCI Ubuntuインスタンスでのコマンド実行ディレクトリ

ほとんどのアプリケーション固有のコマンド (npm install, npm run build, npx prisma migrate deploy, pm2 start) は、Gitでクローンした `PolySeek` ディレクトリのルート (`/home/ubuntu/Polyseek/`) で実行することになります。システムレベルのインストールや設定 (Node.js, PostgreSQL, Nginx, Certbot) は、どのディレクトリからでも実行できますが、適切な権限 (`sudo`) が必要です。

### 推奨ディレクトリ構造

```
/home/ubuntu/
└── polyseek/
    ├── .env.production
    ├── node_modules/
    ├── .next/
    ├── public/
    ├── prisma/
    ├── src/
    ├── package.json
    ├── package-lock.json
    └── ... (その他のプロジェクトファイル)