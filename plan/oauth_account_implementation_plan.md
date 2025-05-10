## OAuth 情報を Account モデルに保存する実装計画

 ### 概要

 OAuth 認証で取得した情報を Account モデルに保存するようにします。

 ### 詳細

 1.  `src/auth.ts` を修正し、`signIn` コールバック内で Account モデルに OAuth 情報を保存する処理を追加します。
     *   まず、既存のユーザーが存在するかどうかを確認する処理を修正し、Account モデルに OAuth 情報が存在するかどうかを確認するようにします。
     *   Account モデルに OAuth 情報が存在しない場合は、新しい Account モデルを作成します。
     *   Account モデルに OAuth 情報が存在する場合は、`access_token` と `refresh_token` を更新します。
 2.  Google と Discord の OAuth プロバイダー設定を追加します。
     *   `.env` ファイルに、Google と Discord のクライアント ID とクライアントシークレットを追加します。
     *   `src/auth.ts` に、Google と Discord のプロバイダー設定を追加します。

 ### Mermaid 図

 ```mermaid
 sequenceDiagram
     participant User
     participant NextAuth
     participant Prisma
     User->>NextAuth: ログイン
     NextAuth->>Google/Discord: 認証リクエスト
     Google/Discord->>NextAuth: 認証情報
     NextAuth->>Prisma: Account モデル検索 (provider, providerAccountId)
     Prisma-->>NextAuth: Account モデル (存在しない場合は null)
     alt Account モデルが存在しない
         NextAuth->>Prisma: Account モデル作成 (provider, providerAccountId, access_token, refresh_token, userId)
         Prisma-->>NextAuth: Account モデル
     else Account モデルが存在する
         NextAuth->>Prisma: Account モデル更新 (access_token, refresh_token)
         Prisma-->>NextAuth: Account モデル
     end
     NextAuth->>User: ログイン成功