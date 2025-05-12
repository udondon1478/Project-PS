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
    async session({ session, user }) { // token 引数を削除
      if (session?.user) {
        // アダプター使用時は user オブジェクトに id が含まれる
        session.user.id = user.id;
      }
      return session;
    },
    async jwt({ token, user }) { // user 引数を追加
      if (user) {
        // アダプター使用時は user オブジェクトに id が含まれる
        token.id = user.id;
      }
      return token;
    },
  },
})