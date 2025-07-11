# PolySeek 本番環境デプロイ計画

## 概要
このドキュメントは、PolySeekアプリケーションをOCIのUbuntuインスタンスにデプロイするための詳細な計画を記述します。テスト段階でのドメイン価値向上を目的とし、データベースもVPS上にセルフホストします。

## デプロイフロー

```mermaid
graph TD
    A[開始] --> B{VPSの選定と初期設定};
    B --> C[必要なソフトウェアのインストール];
    C --> D[環境変数の設定];
    D --> E[アプリケーションのデプロイ];
    E --> F[データベースのセットアップ];
    F --> G[アプリケーションの起動とプロセス管理];
    G --> H[ドメインとSSLの設定];
    H --> I[監視とログ管理];
    I --> J[完了];

    subgraph VPS環境
        B;
        C;
        D;
        E;
        F;
        G;
        H;
        I;
    end
```

### 1. VPSの選定と初期設定

*   **VPSプロバイダーの選定**: OCI (Oracle Cloud Infrastructure) のUbuntuインスタンスを使用します。
*   **OSの選択**: Ubuntu Server LTS (長期サポート版) を使用します。
*   **SSHキーの設定**: パスワード認証ではなく、SSHキー認証を設定し、セキュリティを強化します。
*   **ファイアウォールの設定**: 必要なポート (SSH: 22, HTTP: 80, HTTPS: 443, PostgreSQL: 5432) のみを開放し、それ以外のポートは閉じます。

### 2. 必要なソフトウェアのインストール

*   **Node.jsとnpm**: 最新のLTSバージョンをインストールします。`nvm` (Node Version Manager) を使用するとバージョン管理が容易になります。
    ```bash
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
    source ~/.bashrc # または ~/.zshrc
    nvm install --lts
    nvm use --lts
    ```
*   **DockerとDocker Compose**: DockerとDocker Composeをインストールします。
    ```bash
    sudo apt update
    sudo apt install ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo usermod -aG docker $USER # 現在のユーザーをdockerグループに追加
    newgrp docker # グループの変更を即時反映 (再ログインでも可)
    ```
*   **Git**: リポジトリをクローンするためにGitをインストールします。
    ```bash
    sudo apt install git
    ```
*   **PM2**: Node.jsアプリケーションを永続的に実行し、クラッシュ時に自動再起動させるためのプロセス管理ツールをインストールします。
    ```bash
    npm install -g pm2
    ```
*   **Nginx**: リバースプロキシとしてNginxをインストールし、HTTP/HTTPSリクエストをNext.jsアプリケーションに転送します。
    ```bash
    sudo apt install nginx
    ```
*   **Certbot**: Let's Encryptから無料のSSL証明書を取得し、自動更新を設定するためにCertbotをインストールします。
    ```bash
    sudo snap install --classic certbot
    sudo ln -s /snap/bin/certbot /usr/bin/certbot
    ```

### 3. 環境変数の設定

*   プロジェクトのルートディレクトリに `.env.production` ファイルを作成し、本番環境用の環境変数を設定します。
    *   `DATABASE_URL`: PostgreSQLデータベースへの接続文字列。`docker-compose.yml` で設定した `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` に合わせて設定します。例: `postgresql://[本番環境のDBユーザー名]:[本番環境のDBパスワード]@localhost:5432/[本番環境のDB名]?schema=public`
    *   `NEXTAUTH_SECRET`: Auth.jsのセッションシークレット。強力なランダム文字列を生成して設定します。
    *   `NEXTAUTH_URL`: 本番環境のアプリケーションのURL。例: `https://yourdomain.com`
    *   その他、APIキーや外部サービスへの接続情報など、本番環境で必要なすべての環境変数を設定します。
*   このファイルはGit管理から除外するため、`.gitignore` に追加されていることを確認します。

### 4. アプリケーションのデプロイ

*   VPS上で、アプリケーションを配置するディレクトリに移動し、Gitリポジトリをクローンします。
    ```bash
    git clone --branch feature/deployment-setup https://github.com/udondon1478/PolySeek.git
    cd PolySeek
    ```
*   依存関係をインストールします。
    ```bash
    npm install
    ```
*   Next.jsアプリケーションをビルドします。
    ```bash
    npm run build
    ```

### 5. データベースのセットアップ (Docker Compose利用)

*   プロジェクトのルートディレクトリに `docker-compose.yml` ファイルがあることを確認します。
    ```yaml
    version: "3.9"
    services:
      db:
        image: postgres:17.4
        restart: always
        environment:
          POSTGRES_USER: [本番環境のDBユーザー名] # 強力なユーザー名に変更
          POSTGRES_PASSWORD: [本番環境のDBパスワード] # 強力なパスワードに変更
          POSTGRES_DB: [本番環境のDB名] # プロジェクト名に関連する名前に変更 (例: polyseek_production)
        ports:
          - "5432:5432"
        volumes:
          - db_data:/var/lib/postgresql/data
    volumes:
      db_data:
    ```
    **注意**: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` は、本番環境用に強力な値に変更してください。これらの値は、後述の `.env.production` の `DATABASE_URL` と一致させる必要があります。
*   Docker Composeを使用してデータベースコンテナを起動します。
    ```bash
    docker compose up -d db
    ```
*   データベースコンテナが起動したら、Prismaのマイグレーションを実行し、データベーススキーマを適用します。
    ```bash
    npx prisma migrate deploy
    ```
*   必要に応じて、初期データを投入します。
    ```bash
    npx prisma db seed
    ```

### 6. アプリケーションの起動とプロセス管理

*   PM2を使用してNext.jsアプリケーションを起動します。
    ```bash
    pm2 start npm --name "polyseek-app" -- start
    ```
*   PM2をシステム起動時に自動実行するように設定します。
    ```bash
    pm2 startup systemd
    sudo env PATH=$PATH:/usr/bin /usr/local/lib/node_modules/pm2/bin/pm2 startup systemd -u [ユーザー名] --hp /home/[ユーザー名]
    pm2 save
    ```

### 7. ドメインとSSLの設定

*   **DNS設定**: スタードメインの管理画面で、取得したドメイン (`polyseek.jp`) のDNS設定を行います。
    *   タイプ `A` のレコードを作成し、ホスト名を `@` (ルートドメイン) または `www` に設定し、値 (IPアドレス) をVPSのパブリックIPアドレスに設定します。
*   **Nginx設定**: `/etc/nginx/sites-available/polyseek` のようなNginx設定ファイルを作成し、以下のように設定します。
    ```nginx
    server {
        listen 80;
        server_name polyseek.jp www.polyseek.jp;

        location / {
            proxy_pass http://localhost:3000; # Next.jsアプリケーションが動作するポート
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```
*   設定ファイルを有効化し、Nginxを再起動します。
    ```bash
    sudo ln -s /etc/nginx/sites-available/polyseek /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```
*   **SSL証明書の取得**: Certbotを使用してLet's EncryptからSSL証明書を取得し、Nginxに自動で設定させます。
    ```bash
    sudo certbot --nginx -d polyseek.jp -d www.polyseek.jp
    ```
*   Certbotが自動で更新設定も行いますが、念のため確認します。
    ```bash
    sudo systemctl status certbot.timer
    ```

### 8. 監視とログ管理

*   PM2のログ機能や、`journalctl` などのシステムログツールを使用して、アプリケーションの動作状況を監視します。
*   必要に応じて、SentryやDatadogなどの監視ツールを導入し、エラー監視やパフォーマンス監視を行います。

## OCI Ubuntuインスタンスでのコマンド実行ディレクトリ

ほとんどのアプリケーション固有のコマンド (npm install, npm run build, npx prisma migrate deploy, pm2 start) は、Gitでクローンした `PolySeek` ディレクトリのルート (`/home/ubuntu/PolySeek/`) で実行することになります。システムレベルのインストールや設定 (Node.js, PostgreSQL, Nginx, Certbot) は、どのディレクトリからでも実行できますが、適切な権限 (`sudo`) が必要です。

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