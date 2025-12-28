import { Client } from '@notionhq/client';

export interface ScrapedItem {
  title: string;
  url: string;
  price: string;
  sourceQuery: string;
  isNoise?: boolean; // Default to false if undefined
  thumbnailUrl?: string;
}

export async function addScrapedItemToNotion(item: ScrapedItem): Promise<void> {
  const apiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!apiKey || !databaseId) {
    throw new Error('Missing NOTION_API_KEY or NOTION_DATABASE_ID environment variables');
  }

  const notion = new Client({ auth: apiKey });

  try {
    await notion.pages.create({
      parent: {
        database_id: databaseId,
      },
      properties: {
        '名前': {
          title: [
            {
              text: {
                content: item.title,
              },
            },
          ],
        },
        'URL': {
          url: item.url,
        },
        '価格': {
          rich_text: [
            {
              text: {
                content: item.price,
              },
            },
          ],
        },
        'SourceQuery': {
          select: {
            name: item.sourceQuery,
          },
        },
        'IsNoise': {
          checkbox: item.isNoise ?? false,
        },
        ...(item.thumbnailUrl ? {
          'サムネイル': {
            files: [
              {
                type: 'external',
                name: 'Thumbnail',
                external: {
                  url: item.thumbnailUrl
                }
              }
            ]
          }
        } : {})
      },
    });
    console.log(`[NotionClient] Added: ${item.title}`);
  } catch (error) {
    console.error(`[NotionClient] Failed to add item: ${item.title}`, error);
    // Rethrow or handle as needed. For validation script, logging might be enough to not stop the whole process, 
    // but the implementation plan said "addScrapedItemToNotion", so simple logging is good.
    // However, if we want to ensure data integrity we might want to throw.
    // For now, let's throw so the caller knows it failed.
    throw error;
  }
}
