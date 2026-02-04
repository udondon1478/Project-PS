import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

/**
 * Check if targetId is reachable from startId via tag implications using BFS.
 * Used to detect circular dependencies before creating a new implication.
 * 
 * @param startId - The starting tag ID (potential implied tag).
 * @param targetId - The target tag ID to reach (potential implying tag).
 * @returns Promise<boolean> - true if a path exists (cycle detected), false otherwise.
 */
async function checkReachability(startId: string, targetId: string): Promise<boolean> {
  const visited = new Set<string>();
  const queue: string[] = [startId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;

    if (currentId === targetId) {
      return true;
    }

    if (visited.has(currentId)) {
      continue;
    }

    visited.add(currentId);

    // Get all tags that are implied by the current tag
    const implications = await prisma.tagImplication.findMany({
      where: { implyingTagId: currentId },
      select: { impliedTagId: true },
    });

    for (const implication of implications) {
      if (!visited.has(implication.impliedTagId)) {
        queue.push(implication.impliedTagId);
      }
    }
  }

  return false;
}

/**
 * GET handler: Fetch all tag implications.
 * 
 * Requires ADMIN role.
 * Returns a list of all tag implications ordered by creation date (descending).
 * 
 * @param req - The HTTP request.
 * @returns JSON response with list of implications or error status.
 */
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

/**
 * POST handler: Create a new tag implication.
 * 
 * Requires ADMIN role.
 * Creates a directed implication: implyingTagName -> impliedTagName.
 * 
 * Validations:
 * - Both tags must exist.
 * - Self-implication is not allowed.
 * - Implication must not already exist.
 * - Circular dependency (transitive) check via BFS.
 * 
 * @param req - The HTTP request containing { implyingTagName, impliedTagName }.
 * @returns JSON response with the created implication or error status.
 */
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

    // Check if the implication already exists
    const existing = await prisma.tagImplication.findFirst({
      where: {
        implyingTagId: implyingTag.id,
        impliedTagId: impliedTag.id,
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Implication already exists' }, { status: 409 });
    }

    // Check for transitive circular dependency using BFS
    // If implyingTag.id is reachable from impliedTag.id, creating this would form a cycle
    const isReachable = await checkReachability(impliedTag.id, implyingTag.id);

    if (isReachable) {
      return NextResponse.json({ error: 'Circular implication detected (transitive)' }, { status: 400 });
    }

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

/**
 * DELETE handler: Remove a tag implication.
 * 
 * Requires ADMIN role.
 * Deletes the implication record by ID.
 * 
 * @param req - The HTTP request with ?id=<implicationId> query parameter.
 * @returns JSON response with success message or error status.
 */
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

    const result = await prisma.tagImplication.deleteMany({
      where: { id },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Failed to delete implication:', error);
    return NextResponse.json({ error: 'Failed to delete implication' }, { status: 500 });
  }
}
