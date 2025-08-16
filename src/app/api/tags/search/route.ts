import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const prisma = new PrismaClient();

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
        },
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