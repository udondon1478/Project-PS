# PolySeek システム構成図

```mermaid
C4Context
    title PolySeek システム構成図

    Person(user, "ユーザー", "VRChat向けBooth.pm商品を検索するユーザー")
    System(polyseek_web, "PolySeek Webアプリケーション", "Next.js (App Router) を使用したWebアプリケーション")
    System(booth_pm, "Booth.pm", "商品情報を提供する外部サービス")
    System(google_auth, "Google認証サービス", "ユーザー認証を提供する外部サービス")
    SystemDb(postgresql_db, "PostgreSQLデータベース", "Prisma ORMを介してアクセスされる商品、タグ、ユーザー情報などの永続化ストア")

    Rel(user, polyseek_web, "Webブラウザ経由でアクセス")
    Rel(polyseek_web, booth_pm, "商品情報のスクレイピング/取得", "HTTPS")
    Rel(polyseek_web, google_auth, "ユーザー認証", "OAuth2/OpenID Connect")
    Rel(polyseek_web, postgresql_db, "データ読み書き", "Prisma ORM")

    Boundary(backend, "バックエンドサービス") {
        System(nextjs_api, "Next.js API Routes", "商品検索、登録、更新、タグ管理、認証セッション管理などのAPIエンドポイント")
        Rel(nextjs_api, postgresql_db, "データ操作", "Prisma Client")
        Rel(nextjs_api, booth_pm, "商品情報取得", "HTTPS (Cheerio, node-fetch)")
        Rel(nextjs_api, google_auth, "認証コールバック処理", "Next-Auth")
    }

    Boundary(frontend, "フロントエンド") {
        System(nextjs_app, "Next.js App Router", "UIコンポーネント、ページルーティング、データフェッチ")
        Rel(nextjs_app, nextjs_api, "APIリクエスト", "HTTPS")
        Rel(nextjs_app, user, "UI表示と操作")
    }

    Rel(polyseek_web, backend, "内部API呼び出し")
    Rel(polyseek_web, frontend, "Webページ提供")

    UpdateLayoutConfig({"layout": "sankey"})