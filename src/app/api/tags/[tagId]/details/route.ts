import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { getLocalizedTagName, getLocalizedTagNames } from '@/lib/tag-i18n';

/**
 * 指定されたタグの詳細情報を取得します。
 * 親タグ、子タグ、関連商品、編集履歴なども含みます。
 * 
 * @param request - HTTPリクエスト
 * @param params - ルートパラメータ (tagIdを含む)
 * @returns タグ詳細情報のJSONレスポンス
 */
export async function GET(request: Request, { params }: { params: Promise<{ tagId: string }> }) {
  try {
    const { tagId } = await params;
    const session = await auth();
    const userLanguage = session?.user?.language || 'ja';

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
              language: true,
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
              language: true,
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

    // Localize tag names based on user's language
    const localizedTagName = await getLocalizedTagName(tag, userLanguage);

    // Batch localize parent/child tags
    const allRelatedTags = [
        ...parentTagRelations.map(pt => pt.parent),
        ...childTagRelations.map(ct => ct.child)
    ];
    
    const translationMap = await getLocalizedTagNames(allRelatedTags, userLanguage);

    const localizedParentTags = parentTagRelations.map((pt) => {
        const t = pt.parent;
        const name = (t.language === userLanguage ? (t.displayName || t.name) : translationMap.get(t.id)) || t.displayName || t.name;
        return { ...t, displayName: name };
    });

    const localizedChildTags = childTagRelations.map((ct) => {
        const t = ct.child;
        const name = (t.language === userLanguage ? (t.displayName || t.name) : translationMap.get(t.id)) || t.displayName || t.name;
        return { ...t, displayName: name };
    });

    // Format the data for the response
    const response = {
      ...tag,
      displayName: localizedTagName,
      parentTags: localizedParentTags,
      childTags: localizedChildTags,
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
