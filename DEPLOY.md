# デプロイメントガイド

PolySeek は [Vercel](https://vercel.com/) へのデプロイを推奨しています。Vercel は Next.js の開発元であり、設定が最小限で済むためです。

## Vercel へのデプロイ手順

1. **Vercel アカウントの作成・ログイン**
   [Vercel](https://vercel.com/) にアクセスし、GitHub アカウントでログインします。

2. **新規プロジェクトの作成**
   ダッシュボードの "Add New..." ボタンから "Project" を選択します。

3. **リポジトリのインポート**
   `PolySeek` (またはフォークしたリポジトリ) を選択し、"Import" をクリックします。

4. **ビルド設定**
   Framework Preset が `Next.js` になっていることを確認します。通常、ビルドコマンドや出力ディレクトリの設定変更は不要です。

5. **環境変数の設定**
   "Environment Variables" セクションを展開し、以下の変数を設定してください。
   ※ Security 上の理由から、本番環境のデータベース接続情報やSecretキーを設定します。

   | 変数名 | 説明 | 例 |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | 本番用 PostgreSQL データベースの接続 URL | `postgresql://user:pass@host:5432/db` |
   | `auth_secret` | NextAuth.js 用のシークレット (ランダムな文字列) | `openssl rand -hex 32` で生成 |
   | `AUTH_GITHUB_ID` | GitHub OAuth App の Client ID | |
   | `AUTH_GITHUB_SECRET` | GitHub OAuth App の Client Secret | |
   | `NEXT_PUBLIC_SENTRY_DSN` | Sentry (Client) DSN (任意) | |
   | `SENTRY_DSN` | Sentry (Server) DSN (任意) | |

   > **Note**: `DATABASE_URL` は、Prisma がマイグレーションを実行するために必要です。Vercel Postgres や Neon、Supabase などのマネージドデータベースを使用することをお勧めします。

6. **Deploy**
   "Deploy" ボタンをクリックすると、ビルドとデプロイが開始されます。

## データベースのマイグレーション

Vercel のビルドプロセス中に、Prisma のマイグレーションを自動実行することは一般的に推奨されません（ビルドごとのDB変更はリスクがあるため）。
代わりに、デプロイ時（またはデプロイ直前）に CI/CD パイプライン（GitHub Actionsなど）またはローカルから本番DBに対してマイグレーションを実行します。

### 本番DBへのマイグレーション実行（ローカルから行う場合）

`.env.production` などのファイルに本番DBの `DATABASE_URL` を一時的に設定するか、環境変数を直接渡して実行します。

```bash
DATABASE_URL="postgresql://production-db-url..." npx prisma migrate deploy
```

※ `migrate dev` ではなく **`migrate deploy`** を使用してください。これは既存のマイグレーション履歴に基づいて安全に適用を行うコマンドです。
