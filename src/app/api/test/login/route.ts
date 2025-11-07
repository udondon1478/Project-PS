// src/app/api/test/login/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * テスト専用のAPIエンドポイント。
 * 指定されたメールアドレスのユーザー情報を取得します。
 * 本番環境では利用できません。
 */
export async function POST(req: Request) {
  // 本番環境ではこのAPIを無効化
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ message: 'Not Found' }, { status: 404 });
  }

  try {
    const { email } = await req.json();
    if (typeof email !== 'string') {
      return NextResponse.json({ message: 'Email is required and must be a string.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ message: `User with email ${email} not found.` }, { status: 404 });
    }

    // セキュリティのため、パスワードなどの機密情報は返さない
    const { email: userEmail, id, name, role } = user;
    return NextResponse.json({ id, name, email: userEmail, role });

  } catch (error) {
    console.error('Test login API error:', error);
    return NextResponse.json({ message: 'An unexpected error occurred.' }, { status: 500 });
  }
}
