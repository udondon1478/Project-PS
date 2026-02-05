import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';

/**
 * GET /api/tag-groups
 * Lists all tag groups.
 */
export async function GET() {
  try {
    const groups = await prisma.tagGroup.findMany({
      include: {
        _count: {
          select: { tags: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(groups);
  } catch (error) {
    console.error('Error fetching tag groups:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/tag-groups
 * Creates a new tag group.
 * Requires Admin.
 */
export async function POST(request: Request) {
  if (!await isAdmin()) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, description, iconUrl } = body;

    if (!name) {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    }

    const group = await prisma.tagGroup.create({
      data: {
        name,
        description,
        iconUrl
      }
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error('Error creating tag group:', error);
    // Unique constraint error handling could be added here
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
