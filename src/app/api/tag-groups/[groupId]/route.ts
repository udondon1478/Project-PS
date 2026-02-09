import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';
import { Prisma } from '@prisma/client';

/**
 * GET /api/tag-groups/[groupId]
 * Gets a specific tag group with its members.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const group = await prisma.tagGroup.findUnique({
      where: { id: groupId },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    if (!group) {
      return NextResponse.json({ message: 'Tag group not found' }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error('Error fetching tag group:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PUT /api/tag-groups/[groupId]
 * Updates a tag group.
 * Requires Admin.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  if (!await isAdmin()) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { groupId } = await params;
    const body = await request.json();
    const { name, description, iconUrl } = body;

    const group = await prisma.tagGroup.update({
      where: { id: groupId },
      data: {
        name,
        description,
        iconUrl
      }
    });

    return NextResponse.json(group);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({ message: 'Tag group name already exists' }, { status: 409 });
      }
      if (error.code === 'P2025') {
        return NextResponse.json({ message: 'Not Found' }, { status: 404 });
      }
    }

    console.error('Error updating tag group:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/tag-groups/[groupId]
 * Deletes a tag group.
 * Requires Admin.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  if (!await isAdmin()) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { groupId } = await params;
    await prisma.tagGroup.delete({
      where: { id: groupId }
    });

    return NextResponse.json({ message: 'Tag group deleted' });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ message: 'Not Found' }, { status: 404 });
      }
    }

    console.error('Error deleting tag group:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
