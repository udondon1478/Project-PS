import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma"
import { authConfig } from "./auth.config"

export const runtime = 'nodejs';

export const { handlers, signIn, signOut, auth } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma) as any,
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      // OAuthプロバイダーからのサインインのみ処理
      if (!account || !user.email) {
        return true;
      }

      // 同じメールアドレスを持つ既存ユーザーを検索
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
        include: { accounts: true },
      });

      // 既存ユーザーがいない場合は新規ユーザーとして作成を許可
      if (!existingUser) {
        return true;
      }

      // 既存ユーザーが同じプロバイダーのアカウントを持っているか確認
      const existingAccount = existingUser.accounts.find(
        (acc) => acc.provider === account.provider
      );

      // 同じプロバイダーのアカウントが既にある場合はそのままサインイン
      if (existingAccount) {
        return true;
      }

      // 異なるプロバイダーのアカウントを既存ユーザーにリンク
      await prisma.account.create({
        data: {
          userId: existingUser.id,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          refresh_token: account.refresh_token,
          access_token: account.access_token,
          expires_at: account.expires_at,
          token_type: account.token_type,
          scope: account.scope,
          id_token: account.id_token,
          session_state: account.session_state as string | null,
        },
      });

      // userオブジェクトのIDを既存ユーザーのIDに更新
      // これによりJWTコールバックで正しいユーザー情報が取得される
      user.id = existingUser.id;
      user.name = existingUser.name;
      user.image = existingUser.image;

      return true;
    },
  },
})