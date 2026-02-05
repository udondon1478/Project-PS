import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';
import { Prisma } from '@prisma/client';

/**
 * POST /api/tag-groups/[groupId]/members
 * Adds a tag to the group.
 * Body: { tagId: string }
 */
export async function POST(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  if (!await isAdmin()) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { tagId } = body;
    if (!tagId) return NextResponse.json({ message: 'tagId required' }, { status: 400 });

    const member = await prisma.tagGroupMember.create({
      data: {
        groupId: params.groupId,
        tagId
      }
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({ message: 'Tag already in group' }, { status: 409 });
      }
      if (error.code === 'P2003') {
        return NextResponse.json({ message: 'Invalid groupId or tagId' }, { status: 400 });
      }
    }

    console.error('Error adding member:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/tag-groups/[groupId]/members
 * Removes a tag from the group.
 * Body: { tagId: string }
 */
export async function DELETE(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  if (!await isAdmin()) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { tagId } = body;
    if (!tagId) return NextResponse.json({ message: 'tagId required' }, { status: 400 });

    await prisma.tagGroupMember.delete({
      where: {
        groupId_tagId: {
          groupId: params.groupId,
          tagId
        }
      }
    });

    return NextResponse.json({ message: 'Member removed' });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ message: 'Member not found' }, { status: 404 });
      }
    }

    console.error('Error removing member:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
