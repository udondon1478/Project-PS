import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

/**
 * Definition of an external link associated with a tag.
 */
interface ExternalLink {
  /** Display name of the link */
  name: string;
  /** Valid URL string */
  url: string;
}

/**
 * Request body for updating tag metadata.
 */
interface TagUpdateBody {
  /** Short description of the tag */
  description?: string | null;
  /** Detailed Markdown content for the tag wiki */
  wikiContent?: string | null;
  /** List of external references or related links */
  externalLinks?: ExternalLink[] | null;
  /** Array of visual or functional features that distinguish this tag */
  distinguishingFeatures?: string[] | null;
  /** Optional comment explaining the update */
  comment?: string | null;
}

/**
 * Retrieves a single tag by its ID.
 * 
 * Fetches comprehensive tag data including:
 * - Basic metadata (name, display name)
 * - Wiki content and description
 * - External links and distinguishing features
 * - Category information
 * 
 * @param request - The HTTP request object.
 * @param context - Context containing the route parameters.
 * @returns JSON response with tag data or 404 error if not found.
 */
export async function GET(request: Request, context: { params: Promise<{ tagId: string }> }) {
  const { tagId } = await context.params;

  try {
    const tag = await prisma.tag.findUnique({
      where: { id: tagId },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        wikiContent: true,
        externalLinks: true,
        distinguishingFeatures: true,
        language: true,
        tagCategory: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        count: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    return NextResponse.json(tag);
  } catch (error) {
    console.error('Error fetching tag:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Updates a tag's metadata.
 * 
 * Allows authenticated users to update:
 * - Description
 * - Wiki content (Markdown)
 * - External links
 * - Distinguishing features
 * 
 * Records all changes in `TagMetadataHistory` for audit trails.
 * Validates input types and URL formats before updating.
 * 
 * @param request - The HTTP request containing the update payload.
 * @param context - Context containing the route parameters.
 * @returns JSON response with the updated tag or error status.
 */
export async function PUT(request: Request, context: { params: Promise<{ tagId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const editorId = session.user.id;
  const { tagId } = await context.params;

  try {
    const body: TagUpdateBody = await request.json();
    const { description, wikiContent, externalLinks, distinguishingFeatures, comment } = body;

    // バリデーション
    if (description !== undefined && description !== null && typeof description !== 'string') {
      return NextResponse.json({ error: 'Invalid description' }, { status: 400 });
    }
    if (wikiContent !== undefined && wikiContent !== null && typeof wikiContent !== 'string') {
      return NextResponse.json({ error: 'Invalid wikiContent' }, { status: 400 });
    }
    if (externalLinks !== undefined && externalLinks !== null && !Array.isArray(externalLinks)) {
      return NextResponse.json({ error: 'Invalid externalLinks' }, { status: 400 });
    }
    if (distinguishingFeatures !== undefined && distinguishingFeatures !== null && !Array.isArray(distinguishingFeatures)) {
      return NextResponse.json({ error: 'Invalid distinguishingFeatures' }, { status: 400 });
    }
    if (comment !== undefined && comment !== null && typeof comment !== 'string') {
      return NextResponse.json({ error: 'Invalid comment' }, { status: 400 });
    }

    // 外部リンクのバリデーション
    if (externalLinks) {
      for (const link of externalLinks) {
        // オブジェクトかつ非nullであることを確認
        if (!link || typeof link !== 'object') {
          return NextResponse.json({ error: 'Invalid external link format' }, { status: 400 });
        }
        if (!link.name || typeof link.name !== 'string') {
          return NextResponse.json({ error: 'Invalid external link name' }, { status: 400 });
        }
        if (!link.url || typeof link.url !== 'string') {
          return NextResponse.json({ error: 'Invalid external link url' }, { status: 400 });
        }
        // URLの基本的なバリデーション
        let urlObj;
        try {
          urlObj = new URL(link.url);
        } catch {
          return NextResponse.json({ error: `Invalid URL: ${link.url}` }, { status: 400 });
        }
        // プロトコルのバリデーション (http/https のみ許可)
        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
          return NextResponse.json({ error: `Invalid URL scheme: ${urlObj.protocol}. Only http and https are allowed.` }, { status: 400 });
        }
      }
    }

    const updatedTag = await prisma.$transaction(async (tx) => {
      // 1. Get the current tag
      const currentTag = await tx.tag.findUnique({
        where: { id: tagId },
        select: {
          description: true,
          wikiContent: true,
          externalLinks: true,
          distinguishingFeatures: true,
        },
      });

      if (!currentTag) {
        throw new Error('Tag not found');
      }

      // 2. Build update data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: Record<string, any> = {};

      if (description !== undefined) {
        updateData.description = description;
      }
      if (wikiContent !== undefined) {
        updateData.wikiContent = wikiContent;
      }
      if (externalLinks !== undefined) {
        updateData.externalLinks = externalLinks;
      }
      if (distinguishingFeatures !== undefined) {
        updateData.distinguishingFeatures = distinguishingFeatures;
      }

      // 3. Update the tag
      const updatedTag = await tx.tag.update({
        where: { id: tagId },
        data: updateData,
      });

      // 4. Record the changes in history
      const historyEntries = [];

      if (description !== undefined && description !== currentTag.description) {
        historyEntries.push({
          tagId: tagId,
          editorId: editorId,
          changeType: 'description_update',
          oldValue: currentTag.description,
          newValue: description,
          comment: comment,
        });
      }

      if (wikiContent !== undefined && wikiContent !== currentTag.wikiContent) {
        historyEntries.push({
          tagId: tagId,
          editorId: editorId,
          changeType: 'wiki_content_update',
          oldValue: currentTag.wikiContent,
          newValue: wikiContent,
          comment: comment,
        });
      }

      if (externalLinks !== undefined) {
        const oldLinksStr = JSON.stringify(currentTag.externalLinks);
        const newLinksStr = JSON.stringify(externalLinks);
        if (oldLinksStr !== newLinksStr) {
          historyEntries.push({
            tagId: tagId,
            editorId: editorId,
            changeType: 'external_links_update',
            oldValue: oldLinksStr,
            newValue: newLinksStr,
            comment: comment,
          });
        }
      }

      if (distinguishingFeatures !== undefined) {
        const oldFeaturesStr = JSON.stringify(currentTag.distinguishingFeatures);
        const newFeaturesStr = JSON.stringify(distinguishingFeatures);
        if (oldFeaturesStr !== newFeaturesStr) {
          historyEntries.push({
            tagId: tagId,
            editorId: editorId,
            changeType: 'distinguishing_features_update',
            oldValue: oldFeaturesStr,
            newValue: newFeaturesStr,
            comment: comment,
          });
        }
      }

      if (historyEntries.length > 0) {
        await tx.tagMetadataHistory.createMany({
          data: historyEntries,
        });
      }

      return updatedTag;
    });

    return NextResponse.json(updatedTag);
  } catch (error) {
    if (error instanceof Error && error.message === 'Tag not found') {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }
    console.error('Error updating tag:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
