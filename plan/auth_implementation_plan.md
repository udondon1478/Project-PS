# Auth.jsを用いた認証機能の実装計画

## 概要

Auth.jsを用いて認証機能を実装します。認証プロバイダーはGoogleとDiscordを使用し、認証後のリダイレクト先は認証前にアクセスしていた同一のページに設定します。

## 手順

1.  **Auth.jsのインストール:**

    ```bash
    npm install next-auth
    ```

2.  **APIルートの設定:**

    `src/app/api/auth/[...nextauth]/route.ts`ファイルを作成し、以下のコードを追加します。

    ```typescript
    import { handlers } from "@/auth"
    export const { GET, POST } = handlers;
    ```

3.  **Auth.jsの設定:**

    `src/auth.ts`ファイルを作成し、Auth.jsの設定を行います。

    ```typescript
    import NextAuth from "next-auth"
    import GoogleProvider from "next-auth/providers/google"
    import DiscordProvider from "next-auth/providers/discord"

    export const { auth, handlers, signIn, signOut } = NextAuth({
      providers: [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
        DiscordProvider({
          clientId: process.env.DISCORD_CLIENT_ID,
          clientSecret: process.env.DISCORD_CLIENT_SECRET
        })
      ],
      session: {
        strategy: "jwt"
      },
      callbacks: {
        async redirect({ url, baseUrl }) {
          // Allows relative callback URLs
          if (url.startsWith("/")) return `${baseUrl}${url}`
          // Allows callback URLs on the same origin
          else if (new URL(url).origin === baseUrl) return url
          return baseUrl
        }
      }
    })
    ```

4.  **環境変数の設定:**

    `.env`ファイルに以下の環境変数を設定します。

    ```
    GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
    GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
    DISCORD_CLIENT_ID=YOUR_DISCORD_CLIENT_ID
    DISCORD_CLIENT_SECRET=YOUR_DISCORD_CLIENT_SECRET
    NEXTAUTH_SECRET=YOUR_NEXTAUTH_SECRET
    NEXTAUTH_URL=http://localhost:3000
    ```

5.  **フロントエンドのUI実装:**

    `src/app/components/common/Header.tsx`にログイン・ログアウトボタンを追加します。

    ```typescript
    "use client";
    import { useSession, signIn, signOut } from "next-auth/react"

    export function Header() {
      const { data: session } = useSession()
      if (session) {
        return (
          <>
            Signed in as {session.user?.email} <br />
            <button onClick={() => signOut()}>Sign out</button>
          </>
        )
      }
      return (
        <>
          Not signed in <br />
          <button onClick={() => signIn()}>Sign in</button>
        </>
      )
    }
    ```

6.  **認証状態の保護:**

    認証が必要なページを`middleware.ts`で保護します。

    `middleware.ts`ファイルを作成し、以下のコードを追加します。

    ```typescript
    export { default } from "next-auth/middleware"

    export const config = {
      matcher: ["/profile"]
    }