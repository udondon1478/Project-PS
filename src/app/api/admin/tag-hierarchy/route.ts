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
  // Traverse up from the parent to see if we reach the child
  // This is O(depth) since we only follow one path up the hierarchy
  let currentId = parentId;

  while (currentId) {
    // If we reached the child while traversing parents, it would create a cycle
    if (currentId === childId) {
      return true;
    }

    // Get the parent of the current node
    const parentRelation = await client.tagHierarchy.findFirst({
      where: { childId: currentId },
      select: { parentId: true },
    });

    if (!parentRelation) {
      // No more parents, we've reached the root
      break;
    }

    currentId = parentRelation.parentId;
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
        { message: 'Invalid JSON body' },
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
        { message: 'Invalid JSON body' },
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
