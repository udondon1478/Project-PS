import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const implications = await prisma.tagImplication.findMany({
      include: {
        implyingTag: true,
        impliedTag: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(implications);
  } catch (error) {
    console.error('Failed to fetch implications:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { implyingTagName, impliedTagName } = await req.json();

    if (!implyingTagName || !impliedTagName) {
      return NextResponse.json({ error: 'Both tag names are required' }, { status: 400 });
    }

    if (implyingTagName === impliedTagName) {
      return NextResponse.json({ error: 'Self-implication is not allowed' }, { status: 400 });
    }

    // Find tags (case-insensitive find might be better, but assuming exact normalized name for now)
    // Actually, tag names are unique and should be normalized.
    // If we want to support user input, we should normalize. But Admin should know.
    
    const implyingTag = await prisma.tag.findUnique({ where: { name: implyingTagName } });
    const impliedTag = await prisma.tag.findUnique({ where: { name: impliedTagName } });

    if (!implyingTag || !impliedTag) {
      return NextResponse.json({ 
        error: `Tags not found: ${!implyingTag ? implyingTagName : ''} ${!impliedTag ? impliedTagName : ''}`.trim() 
      }, { status: 404 });
    }

    // Check for circular dependency (simple check: reverse implication exists?)
    const reverse = await prisma.tagImplication.findUnique({
      where: {
        implyingTagId_impliedTagId: {
          implyingTagId: impliedTag.id,
          impliedTagId: implyingTag.id,
        },
      },
    });

    if (reverse) {
      return NextResponse.json({ error: 'Circular implication detected (direct reverse)' }, { status: 400 });
    }
    
    // Note: Deep circular dependency check is expensive. We rely on logic to handle it, 
    // but ideally we should prevent it here.
    // For now, allow simple creation.

    const implication = await prisma.tagImplication.create({
      data: {
        implyingTagId: implyingTag.id,
        impliedTagId: impliedTag.id,
      },
      include: {
        implyingTag: true,
        impliedTag: true,
      },
    });

    return NextResponse.json(implication);
  } catch (error) {
    console.error('Failed to create implication:', error);
    return NextResponse.json({ error: 'Failed to create implication' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await prisma.tagImplication.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Failed to delete implication:', error);
    return NextResponse.json({ error: 'Failed to delete implication' }, { status: 500 });
  }
}
