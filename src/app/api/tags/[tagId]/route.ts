import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function PUT(request: Request, context: { params: Promise<{ tagId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const editorId = session.user.id;
  const { tagId } = await context.params;

  try {
    const { description, comment }: { description: string; comment?: string } = await request.json();

    if (typeof description !== 'string') {
      return NextResponse.json({ error: 'Invalid description' }, { status: 400 });
    }

    const updatedTag = await prisma.$transaction(async (tx) => {
      // 1. Get the current tag to find the old description
      const currentTag = await tx.tag.findUnique({
        where: { id: tagId },
        select: { description: true },
      });

      if (!currentTag) {
        // This will cause the transaction to rollback
        throw new Error('Tag not found');
      }

      const oldValue = currentTag.description;

      // 2. Update the tag's description
      const updatedTag = await tx.tag.update({
        where: { id: tagId },
        data: { description: description },
      });

      // 3. Record the change in history
      await tx.tagMetadataHistory.create({
        data: {
          tagId: tagId,
          editorId: editorId,
          changeType: 'description_update',
          oldValue: oldValue,
          newValue: description,
          comment: comment,
        },
      });

      return updatedTag;
    });

    return NextResponse.json(updatedTag);
  } catch (error) {
    if (error instanceof Error && error.message === 'Tag not found') {
        return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }
    console.error('Error updating tag description:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
