// src/lib/auth.ts
import { auth } from "@/auth"; // パスを修正
import { Role } from "@prisma/client";
import { prisma } from "@/lib_prisma/prisma"; // パスを修正

export const isAdmin = async (): Promise<boolean> => {
  console.log('isAdmin: Checking authentication status...');
  const session = await auth();
  console.log('isAdmin: Session:', session);

  if (!session?.user?.id) {
    console.log('isAdmin: User not authenticated.');
    return false; // ユーザーが認証されていない
  }

  console.log('isAdmin: User authenticated, fetching user role for ID:', session.user.id);
  // データベースからユーザーのロールを取得
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  console.log('isAdmin: User from DB:', user);

  const result = user?.role === Role.ADMIN;
  console.log('isAdmin: Is admin:', result);
  return result;
};