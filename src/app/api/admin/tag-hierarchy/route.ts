// src/app/api/admin/tag-hierarchy/route.ts
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';

/**
 * Helper function to detect cycles in tag hierarchy
 * Checks if adding a parent-child relationship would create a cycle
 * Optimized to O(depth) by traversing only the ancestor path
 * @param parentId - The ID of the parent tag
 * @param childId - The ID of the child tag
 * @param tx - Optional Prisma transaction client
 * @returns true if a cycle would be created, false otherwise
 */
async function wouldCreateCycle(
  parentId: string,
  childId: string,
  tx?: Prisma.TransactionClient
): Promise<boolean> {
  // If parent and child are the same, it's a cycle
  if (parentId === childId) {
    return true;
  }

  const client = tx || prisma;

  // Check if the child is already an ancestor of the parent
  // This is done by traversing up from the parent using BFS
  const visited = new Set<string>();
  let frontier = [parentId];

  while (frontier.length > 0) {
    // Check if any node in the current frontier is the child
    if (frontier.includes(childId)) {
      return true;
    }

    // Mark current frontier as visited
    frontier.forEach(id => visited.add(id));

    // Fetch all parents for the entire frontier in one query
    const parentRelations = await client.tagHierarchy.findMany({
      where: {
        childId: { in: frontier }
      },
      select: { parentId: true },
    });

    // Collect next frontier (unique parents not yet visited)
    const nextFrontier = new Set<string>();
    for (const relation of parentRelations) {
      if (!visited.has(relation.parentId)) {
        nextFrontier.add(relation.parentId);
      }
    }
    
    frontier = Array.from(nextFrontier);
  }

  return false;
}

/**
 * POST /api/admin/tag-hierarchy
 * Create a new parent-child relationship between tags
 */
export async function POST(request: Request) {
  // Check admin authorization
  if (!await isAdmin()) {
    return NextResponse.json({ message: '管理者権限が必要です。' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { message: '不正なJSON形式です。' },
        { status: 400 }
      );
    }
    throw error;
  }

  try {
    const { parentId, childId } = body;

    // Validate required fields
    if (!parentId || !childId) {
      return NextResponse.json(
        { message: '必須フィールドが不足しています (parentId, childId)。' },
        { status: 400 }
      );
    }

    // Check if both tags exist
    const [parentTag, childTag] = await Promise.all([
      prisma.tag.findUnique({ where: { id: parentId } }),
      prisma.tag.findUnique({ where: { id: childId } }),
    ]);

    if (!parentTag) {
      return NextResponse.json(
        { message: '指定された親タグが存在しません。', field: 'parentId' },
        { status: 404 }
      );
    }

    if (!childTag) {
      return NextResponse.json(
        { message: '指定された子タグが存在しません。', field: 'childId' },
        { status: 404 }
      );
    }

    // Use atomic transaction for cycle check and creation
    const newHierarchy = await prisma.$transaction(async (tx) => {
      // Check for cycle within transaction
      const cycleDetected = await wouldCreateCycle(parentId, childId, tx);
      if (cycleDetected) {
        throw new Error('CYCLE_DETECTED');
      }

      // Check if the relationship already exists
      const existingRelation = await tx.tagHierarchy.findUnique({
        where: {
          parentId_childId: {
            parentId,
            childId,
          },
        },
      });

      if (existingRelation) {
        throw new Error('RELATION_EXISTS');
      }

      // Create the hierarchy relation
      return await tx.tagHierarchy.create({
        data: {
          parentId,
          childId,
        },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              displayName: true,
            },
          },
          child: {
            select: {
              id: true,
              name: true,
              displayName: true,
            },
          },
        },
      });
    });

    return NextResponse.json(newHierarchy, { status: 201 });
  } catch (error) {
    console.error('Error creating tag hierarchy:', error);

    // Handle custom errors from transaction
    if (error instanceof Error) {
      if (error.message === 'CYCLE_DETECTED') {
        return NextResponse.json(
          { message: 'この親子関係を追加すると循環参照が発生します。子タグは親タグの祖先になることはできません。' },
          { status: 400 }
        );
      }
      if (error.message === 'RELATION_EXISTS') {
        return NextResponse.json(
          { message: 'この親子関係は既に存在します。' },
          { status: 409 }
        );
      }
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { message: 'この親子関係は既に存在します。' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        message: 'タグ階層の作成に失敗しました。',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tag-hierarchy
 * Delete an existing parent-child relationship between tags
 */
export async function DELETE(request: Request) {
  // Check admin authorization
  if (!await isAdmin()) {
    return NextResponse.json({ message: '管理者権限が必要です。' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { message: '不正なJSON形式です。' },
        { status: 400 }
      );
    }
    throw error;
  }

  try {
    const { parentId, childId } = body;

    // Validate required fields
    if (!parentId || !childId) {
      return NextResponse.json(
        { message: '必須フィールドが不足しています (parentId, childId)。' },
        { status: 400 }
      );
    }

    // Delete the hierarchy relation
    const deletedHierarchy = await prisma.tagHierarchy.delete({
      where: {
        parentId_childId: {
          parentId,
          childId,
        },
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
        child: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
      },
    });

    return NextResponse.json(deletedHierarchy);
  } catch (error) {
    console.error('Error deleting tag hierarchy:', error);

    // Check for specific Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { message: '指定されたタグ階層が見つかりません。' },
          { status: 404 }
        );
      }
      if (error.code === 'P2002') {
        return NextResponse.json(
          { message: 'Conflict error during deletion.' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        message: 'タグ階層の削除に失敗しました。',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
