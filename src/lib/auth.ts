// src/lib/auth.ts
import { auth } from "@/auth"; // @/authからインポート
import { type DefaultSession } from "next-auth"; // next-authからDefaultSessionをインポート
import { prisma } from "@/lib/prisma"; // パスを修正
import { Role } from "@prisma/client"; // Role Enumを直接インポート

// Auth.jsのSession型を拡張してroleプロパティを追加
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: Role; // Role型をインポートして使用
      termsAgreedAt: Date | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    termsAgreedAt: Date | null;
  }
}

// isAdmin関数のみをエクスポート
export const isAdmin = async (): Promise<boolean> => {
  console.log('isAdmin: Checking authentication status...');
  const session = await auth();
  console.log('isAdmin: Session:', session);

  if (!session?.user?.id) {
    console.log('isAdmin: User not authenticated.');
    return false; // ユーザーが認証されていない
  }

  // セッションにroleが含まれているか確認
  // Auth.jsの設定（例: callbacks.session）でroleをセッションに追加していることを前提とします。
  // データベースアダプターを使用している場合、userオブジェクトにはデータベースから取得したroleが含まれているはずです。
  if (session.user.role !== undefined) {
    console.log('isAdmin: User role from session:', session.user.role);
    const result = session.user.role === Role.ADMIN; // Role Enumを直接使用
    console.log('isAdmin: Is admin:', result);
    return result;
  }

  // セッションにroleが含まれていない場合（例: データベースアダプターがroleをセッションに含めない設定になっている）、
  // データベースからユーザーのロールを取得するフォールバック処理
  console.log('isAdmin: User authenticated, fetching user role from DB for ID:', session.user.id);
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  console.log('isAdmin: User from DB:', user);

  const result = user?.role === Role.ADMIN; // Role Enumを直接使用
  console.log('isAdmin: Is admin:', result);
  return result;
};