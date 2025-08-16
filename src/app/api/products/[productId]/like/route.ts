import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// いいねを追加するAPI
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  const { productId } = await context.params;
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  if (!productId) {
    return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
  }

  try {
    // 既にいいねしていないか確認
    const existingLike = await prisma.productLike.findUnique({
      where: {
        productId_userId: {
          productId,
          userId,
        },
      },
    });

    if (existingLike) {
      return NextResponse.json({ message: 'Already liked' }, { status: 200 });
    }

    // いいねを追加
    await prisma.productLike.create({
      data: {
        productId,
        userId,
      },
    });

    return NextResponse.json({ message: 'Product liked successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error liking product:', error);
    return NextResponse.json({ error: 'Failed to like product' }, { status: 500 });
  }
}

// いいねを削除するAPI
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  const { productId } = await context.params;
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  if (!productId) {
    return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
  }

  try {
    // いいねを削除
    await prisma.productLike.delete({
      where: {
        productId_userId: {
          productId,
          userId,
        },
      },
    });

    return NextResponse.json({ message: 'Product unliked successfully' }, { status: 200 });
  } catch (error) {
    // 削除対象が見つからない場合もエラーになるので、考慮が必要
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Like entry not found' }, { status: 404 });
    }
    console.error('Error unliking product:', error);
    return NextResponse.json({ error: 'Failed to unlike product' }, { status: 500 });
  }
}
