import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryNamesParam = searchParams.get('categoryNames');
    const categoryNames = categoryNamesParam ? categoryNamesParam.split(',') : [];

    // カテゴリ名のマッピング（後方互換性のため）
    // age_rating → rating への移行をサポート
    const categoryMapping: Record<string, string[]> = {
      'age_rating': ['age_rating', 'rating'], // 両方のカテゴリを検索
    };

    // カテゴリ名を展開（マッピングがあれば適用）
    const expandedCategoryNames = categoryNames.flatMap(
      name => categoryMapping[name] || [name]
    );

    const tags = await prisma.tag.findMany({
      where: {
        tagCategory: {
          name: {
            in: expandedCategoryNames.length > 0 ? expandedCategoryNames : undefined, // categoryNamesが空の場合はフィルタリングしない
          },
        },
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        tagCategory: { // TagCategory モデルを関連付けて取得
          select: {
            id: true,
            name: true,
            color: true, // カテゴリの色を取得
          },
        },
      },
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error fetching tags by type:', error);
    return NextResponse.json({ message: 'Failed to fetch tags' }, { status: 500 });
  }
}