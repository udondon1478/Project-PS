// src/app/api/admin/tag-types/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { isAdmin } from '@/lib/auth'; // isAdminヘルパー関数をインポート

const prisma = new PrismaClient();

export async function GET() {
  // 管理者判定
  if (!await isAdmin()) {
    return NextResponse.json({ message: '管理者権限が必要です。' }, { status: 403 });
  }

  try {
    // TagCategoryテーブルからすべてのカテゴリ名を取得
    const tagCategories = await prisma.tagCategory.findMany({
      select: {
        name: true,
      },
      orderBy: {
        name: 'asc', // カテゴリ名でソート
      },
    });

    // 結果を文字列の配列に変換
    const types = tagCategories.map(category => category.name);

    return NextResponse.json(types);
  } catch (error) {
    console.error('Error fetching tag types:', error);
    return NextResponse.json({ message: 'タグタイプの取得に失敗しました。' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}