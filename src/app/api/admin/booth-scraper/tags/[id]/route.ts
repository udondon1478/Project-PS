
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from "@/auth";
import { Role, Prisma } from "@prisma/client";

// PATCH: タグの有効/無効切り替えとカテゴリ更新
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Params is a Promise in Next.js 15+
) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { enabled, category } = body;

    // Build update data dynamically
    const updateData: { enabled?: boolean; category?: string | null } = {};
    
    if (typeof enabled === 'boolean') {
      updateData.enabled = enabled;
    }
    
    if ('category' in body) {
      updateData.category = category || null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updatedTag = await prisma.scraperTargetTag.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(updatedTag);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
  }
}

// DELETE: タグの削除
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    await prisma.scraperTargetTag.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
       return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
}
