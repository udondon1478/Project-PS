import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma" // lib/prisma.ts からシングルトンインスタンスをインポート

export const runtime = 'nodejs'; // Edge RuntimeでのPrismaClientエラーを回避

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma), // Prisma Adapterを追加
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    // signIn コールバックはアダプターがユーザーの作成/検索を処理するため、ここでは不要
    // 必要に応じて、追加の検証や処理を記述することは可能
    async jwt({ token, user, account }) { // user, account 引数を追加
      // 初回ログイン時、またはアカウントがリンクされたときにアクセストークンをトークンに保存
      if (account) {
        token.accessToken = account.access_token;
        // 必要に応じて他のトークン情報（refresh_token, expires_atなど）も保存
      }
      if (user) {
        // アダプター使用時は user オブジェクトに id が含まれる
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) { // token 引数を追加
      if (session?.user) {
        // token から id をセッションにコピー (jwt コールバックで設定した場合)
        session.user.id = token.id as string; // 型アサーションが必要な場合あり

        // token から accessToken をセッションにコピー
        session.accessToken = token.accessToken as string; // 型アサーションが必要な場合あり
      }
      return session;
    },
  },
})