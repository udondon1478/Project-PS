
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH: タグの有効/無効切り替え
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Params is a Promise in Next.js 15+
) {
  try {
    const { id } = await params;
    const { enabled } = await req.json();

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 });
    }

    const updatedTag = await prisma.scraperTargetTag.update({
      where: { id },
      data: { enabled }
    });

    return NextResponse.json(updatedTag);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
  }
}

// DELETE: タグの削除
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.scraperTargetTag.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
}
