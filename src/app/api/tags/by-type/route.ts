import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type) {
      return NextResponse.json({ message: 'Type parameter is required' }, { status: 400 });
    }

    const tags = await prisma.tag.findMany({
      where: {
        type: type,
      },
      select: {
        id: true,
        name: true,
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
  } finally {
    await prisma.$disconnect();
  }
}