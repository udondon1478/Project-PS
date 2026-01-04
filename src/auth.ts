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

      // OAuthプロバイダーからのメールアドレス検証状態をチェック
      // 検証済み（emailVerified === true）の場合のみサインインを許可
      // 未検証（false）または不明（undefined）の場合は拒否（セキュリティ対策）
      // Note: account.email_verified と user.emailVerified は型定義にないため any でアクセス
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emailVerified = (account as any).email_verified ?? (user as any).emailVerified;
      if (emailVerified !== true) {
        console.warn(`OAuth sign-in denied: email not verified or verification status unknown for provider ${account.provider}`);
        return false;
      }

      try {
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
        // トランザクションを使用してアトミックに処理（競合状態を防止）
        await prisma.$transaction(async (tx) => {
          // 競合状態を防ぐため、トランザクション内で再度アカウントの存在を確認
          const existingAccountInTx = await tx.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
          });

          if (existingAccountInTx) {
            // 既にアカウントが存在する場合はスキップ（別のリクエストで作成された可能性）
            return;
          }

          await tx.account.create({
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
              session_state: typeof account.session_state === 'string' ? account.session_state : null,
            },
          });
        });

        // userオブジェクトのIDを既存ユーザーのIDに更新
        // これによりJWTコールバックで正しいユーザー情報が取得される
        user.id = existingUser.id;
        user.name = existingUser.name;
        user.image = existingUser.image;
        // JWTコールバックで必要な追加フィールドをコピー
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (user as any).role = existingUser.role;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (user as any).status = existingUser.status;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (user as any).termsAgreedAt = existingUser.termsAgreedAt;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (user as any).isSafeSearchEnabled = existingUser.isSafeSearchEnabled;

        return true;
      } catch (error) {
        console.error("OAuth sign-in error:", error);
        // データベースエラー時はサインインを拒否して安全に失敗
        return false;
      }
    },
  },
})