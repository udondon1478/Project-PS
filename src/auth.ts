import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Discord from "next-auth/providers/discord"
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma" // lib/prisma.ts からシングルトンインスタンスをインポート

export const runtime = 'nodejs'; // Edge RuntimeでのPrismaClientエラーを回避

export const { handlers, signIn, signOut, auth } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma) as any, // Prisma Adapterを追加 (型の不一致を回避するためas any使用)
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
    }),
  ],
  trustHost: true, // ホストの信頼を有効化
  callbacks: {
    // signIn コールバックはアダプターがユーザーの作成/検索を処理するため、ここでは不要
    // 必要に応じて、追加の検証や処理を記述することは可能
    async session({ session, user }) { // token 引数を削除
      if (user && session?.user) {
        // アダプター使用時は user オブジェクトに id が含まれる
        session.user.id = user.id;
        session.user.termsAgreedAt = user.termsAgreedAt;
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