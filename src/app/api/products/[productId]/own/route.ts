import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { Prisma } from '@prisma/client';

// 所有済みを追加するAPI
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { productId } = await params;
  const userId = session.user.id;

  if (!productId) {
    return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
  }

  try {
    // 既に所有済みリストにないか確認
    const existingOwner = await prisma.productOwner.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existingOwner) {
      return NextResponse.json({ message: 'Already in owned list' }, { status: 200 });
    }

    // 所有済みリストに追加
    await prisma.productOwner.create({
      data: {
        productId,
        userId,
      },
    });

    return NextResponse.json({ message: 'Added to owned list' }, { status: 201 });
  } catch (error) {
    console.error('Error adding to owned list:', error);
    return NextResponse.json({ error: 'Failed to add to owned list' }, { status: 500 });
  }
}

// 所有済みから削除するAPI
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { productId } = await params;
  const userId = session.user.id;

  if (!productId) {
    return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
  }

  try {
    // 所有済みリストから削除
    await prisma.productOwner.delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    return NextResponse.json({ message: 'Removed from owned list' }, { status: 200 });
  } catch (error) {
    // 削除対象が見つからない場合もエラーになるので、考慮が必要
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Owned entry not found' }, { status: 404 });
    }
    console.error('Error removing from owned list:', error);
    return NextResponse.json({ error: 'Failed to remove from owned list' }, { status: 500 });
  }
}
