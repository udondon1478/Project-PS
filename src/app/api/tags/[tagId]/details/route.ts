import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(request: Request, { params }: { params: Promise<{ tagId: string }> }) {
  try {
    const { tagId } = await params;
    const session = await auth();

    if (!tagId) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 });
    }

    const [tag, parentTagRelations, childTagRelations, productRelations, history] = await prisma.$transaction([
      // 1. Fetch the tag itself
      prisma.tag.findUnique({
        where: { id: tagId },
        select: {
          id: true,
          name: true,
          displayName: true,
          description: true,
          count: true,
          language: true,
          isAlias: true,
          canonicalId: true,
          tagCategoryId: true,
          tagCategory: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      // 2. Fetch parent tags
      prisma.tagHierarchy.findMany({
        where: { childId: tagId },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              displayName: true,
              description: true,
              count: true,
              tagCategoryId: true,
            },
          },
        },
      }),

      // 3. Fetch child tags
      prisma.tagHierarchy.findMany({
        where: { parentId: tagId },
        include: {
          child: {
            select: {
              id: true,
              name: true,
              displayName: true,
              description: true,
              count: true,
              tagCategoryId: true,
            },
          },
        },
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

    const report = session?.user?.id
      ? await prisma.report.findUnique({
          where: {
            reporterId_tagId: {
              reporterId: session.user.id,
              tagId: tagId,
            },
          },
        })
      : null;

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    const hasReported = !!report;

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
      hasReported,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error(`Error fetching tag details:`, error);
    return NextResponse.json({ error: 'Failed to fetch tag details' }, { status: 500 });
  }
}
