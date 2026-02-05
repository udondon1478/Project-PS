import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';

/**
 * GET /api/tag-groups/[groupId]
 * Gets a specific tag group with its members.
 */
export async function GET(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    const group = await prisma.tagGroup.findUnique({
      where: { id: params.groupId },
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
  { params }: { params: { groupId: string } }
) {
  if (!await isAdmin()) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, description, iconUrl } = body;

    const group = await prisma.tagGroup.update({
      where: { id: params.groupId },
      data: {
        name,
        description,
        iconUrl
      }
    });

    return NextResponse.json(group);
  } catch (error) {
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
  { params }: { params: { groupId: string } }
) {
  if (!await isAdmin()) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    await prisma.tagGroup.delete({
      where: { id: params.groupId }
    });

    return NextResponse.json({ message: 'Tag group deleted' });
  } catch (error) {
    console.error('Error deleting tag group:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
