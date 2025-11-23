// src/lib/session.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * 現在ログイン中のユーザー情報を取得する
 * @returns ユーザーオブジェクト（id, email, name, role）またはnull
 */
export const getCurrentUser = async () => {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  try {
    // データベースからユーザー情報を取得（roleを含む）
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return user;
  } catch (error) {
    console.error('Failed to fetch user from database:', error);
    return null;
  }
};