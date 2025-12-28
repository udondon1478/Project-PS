import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json({ message: "検索クエリがありません。" }, { status: 400 });
    }

    // タグを検索し、登録数が多い順にソート
    const tags = await prisma.tag.findMany({
      where: {
        name: {
          contains: query, // 部分一致検索
          mode: 'insensitive', // 大文字小文字を区別しない
        },
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        count: true,
        tagCategoryId: true,
      },
      orderBy: {
        count: 'desc', // 登録数が多い順
      },
      take: 10, // 最大10件まで
    });

    return NextResponse.json(tags, { status: 200 });
  } catch (error) {
    console.error("タグ検索エラー:", error);
    const errorMessage = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ message: "タグ検索に失敗しました。", error: errorMessage }, { status: 500 });
  }
}