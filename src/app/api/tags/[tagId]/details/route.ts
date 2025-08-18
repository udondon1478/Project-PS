import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ tagId: string }> }) {
  try {
    const { tagId } = await params;

    if (!tagId) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 });
    }

    const [tag, parentTagRelations, childTagRelations, productRelations, history] = await prisma.$transaction([
      // 1. Fetch the tag itself
      prisma.tag.findUnique({
        where: { id: tagId },
      }),

      // 2. Fetch parent tags
      prisma.tagHierarchy.findMany({
        where: { childId: tagId },
        include: { parent: true },
      }),

      // 3. Fetch child tags
      prisma.tagHierarchy.findMany({
        where: { parentId: tagId },
        include: { child: true },
      }),

      // 4. Fetch associated products (limit to 5)
      prisma.productTag.findMany({
        where: { tagId: tagId },
        take: 5,
        orderBy: {
          product: {
            viewCount: 'desc'
          }
        },
        include: {
          product: {
            include: {
              images: {
                where: { isMain: true },
                take: 1,
              },
            },
          },
        },
      }),

      // 5. Fetch description edit history
      prisma.tagMetadataHistory.findMany({
        where: {
          tagId: tagId,
          changeType: 'description_update',
        },
        include: {
          editor: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Format the data for the response
    const response = {
      ...tag,
      parentTags: parentTagRelations.map(pt => pt.parent),
      childTags: childTagRelations.map(ct => ct.child),
      products: productRelations.map(p => ({
        id: p.product.id,
        title: p.product.title,
        mainImageUrl: p.product.images[0]?.imageUrl || null,
      })),
      history: history,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error(`Error fetching tag details:`, error);
    return NextResponse.json({ error: 'Failed to fetch tag details' }, { status: 500 });
  }
}
