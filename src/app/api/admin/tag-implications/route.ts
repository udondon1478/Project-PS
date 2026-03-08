import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';
import { wouldCreateCycle } from '@/lib/tagImplication';

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { message: '管理者権限が必要です。' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') ?? '20', 10);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);
    const tagId = searchParams.get('tagId');

    const where = tagId
      ? { OR: [{ implyingTagId: tagId }, { impliedTagId: tagId }] }
      : {};

    const [implications, total] = await Promise.all([
      prisma.tagImplication.findMany({
        where,
        include: {
          implyingTag: {
            select: { id: true, name: true, displayName: true },
          },
          impliedTag: {
            select: { id: true, name: true, displayName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.tagImplication.count({ where }),
    ]);

    return NextResponse.json({ implications, total });
  } catch (error) {
    console.error('Error fetching tag implications:', error);
    return NextResponse.json(
      { message: 'タグ含意の取得に失敗しました。' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { message: '管理者権限が必要です。' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { implyingTagId, impliedTagId } = body;

    if (!implyingTagId || !impliedTagId) {
      return NextResponse.json(
        { message: 'implyingTagId と impliedTagId は必須です。' },
        { status: 400 }
      );
    }

    if (implyingTagId === impliedTagId) {
      return NextResponse.json(
        { message: '自己参照の含意は作成できません。' },
        { status: 400 }
      );
    }

    const implyingTag = await prisma.tag.findUnique({
      where: { id: implyingTagId },
    });
    if (!implyingTag) {
      return NextResponse.json(
        { message: `タグ '${implyingTagId}' が存在しません。` },
        { status: 400 }
      );
    }

    const impliedTag = await prisma.tag.findUnique({
      where: { id: impliedTagId },
    });
    if (!impliedTag) {
      return NextResponse.json(
        { message: `タグ '${impliedTagId}' が存在しません。` },
        { status: 400 }
      );
    }

    if (await wouldCreateCycle(implyingTagId, impliedTagId)) {
      return NextResponse.json(
        { message: 'この含意を追加すると循環参照が発生します。' },
        { status: 400 }
      );
    }

    const existing = await prisma.tagImplication.findUnique({
      where: {
        implyingTagId_impliedTagId: { implyingTagId, impliedTagId },
      },
    });
    if (existing) {
      return NextResponse.json(
        { message: 'この含意関係は既に存在します。' },
        { status: 409 }
      );
    }

    const created = await prisma.tagImplication.create({
      data: { implyingTagId, impliedTagId },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creating tag implication:', error);
    return NextResponse.json(
      { message: 'タグ含意の作成に失敗しました。' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { message: '管理者権限が必要です。' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { message: '削除対象の含意ID (id) が必要です。' },
        { status: 400 }
      );
    }

    const deleted = await prisma.tagImplication.delete({
      where: { id },
    });

    return NextResponse.json(deleted);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return NextResponse.json(
        { message: '指定された含意IDが見つかりません。' },
        { status: 404 }
      );
    }
    console.error('Error deleting tag implication:', error);
    return NextResponse.json(
      { message: 'タグ含意の削除に失敗しました。' },
      { status: 500 }
    );
  }
}
