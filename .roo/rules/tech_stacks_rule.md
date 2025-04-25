## 技術スタック
プロジェクトで定義された技術スタックに従って開発を行います。
特に指定がない場合は、一般的なベストプラクティスに基づいて技術を選定します。
これらのライブラリを使用する場合は必ずContext7 MCPによって取得した最新のドキュメントに従ってください

### フロントエンド
必要な場合に限り、以下のライブラリを使用してください。
要件によって使用するライブラリは増やして構いません。

- 言語: TypeScript
- フレームワーク: Next.js (AppRouter)
- UI: shadcn/ui + Tailwind CSS
- 認証ライブラリ: Auth.js

### バックエンド
- 言語: Node.js (TypeScript)
- API: REST or GraphQL
- データベース: PostgreSQL
- ORM: Prisma

### その他
- ランタイム: Node.js 最新のLTSバージョン
- パッケージ管理: npm
- バージョン管理ツール: Git