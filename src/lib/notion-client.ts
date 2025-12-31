import { Client } from '@notionhq/client';

export interface ScrapedItem {
  title: string;
  url: string;
  price: string;
  sourceQuery: string;
  isNoise?: boolean; // Default to false if undefined
  thumbnailUrl?: string;
}

export interface NotionRecord {
  pageId: string;
  title: string;
  url: string;
  price: string;
  thumbnailUrl?: string;
  isNoise: boolean;
}

export interface DiffItem {
  title: string;
  url: string;
  price: string;
  thumbnailUrl?: string;
  diffType: '全検索のみ' | 'プロパティのみ';
  isNoise: boolean;
}

// Type guard helpers for safe Notion property access
function getTitleValue(properties: Record<string, unknown>, key: string): string {
  const prop = properties[key];
  if (prop && typeof prop === 'object' && 'title' in prop) {
    const titleProp = prop as { title?: unknown[] };
    if (Array.isArray(titleProp.title) && titleProp.title.length > 0) {
      const first = titleProp.title[0] as { plain_text?: string };
      return typeof first?.plain_text === 'string' ? first.plain_text : '';
    }
  }
  return '';
}

function getUrlValue(properties: Record<string, unknown>, key: string): string {
  const prop = properties[key];
  if (prop && typeof prop === 'object' && 'url' in prop) {
    const urlProp = prop as { url?: unknown };
    return typeof urlProp.url === 'string' ? urlProp.url : '';
  }
  return '';
}

function getRichTextValue(properties: Record<string, unknown>, key: string): string {
  const prop = properties[key];
  if (prop && typeof prop === 'object' && 'rich_text' in prop) {
    const rtProp = prop as { rich_text?: unknown[] };
    if (Array.isArray(rtProp.rich_text) && rtProp.rich_text.length > 0) {
      const first = rtProp.rich_text[0] as { plain_text?: string };
      return typeof first?.plain_text === 'string' ? first.plain_text : '';
    }
  }
  return '';
}

function getFilesExternalUrl(properties: Record<string, unknown>, key: string): string | undefined {
  const prop = properties[key];
  if (prop && typeof prop === 'object' && 'files' in prop) {
    const filesProp = prop as { files?: unknown[] };
    if (Array.isArray(filesProp.files) && filesProp.files.length > 0) {
      const first = filesProp.files[0] as { external?: { url?: string } };
      if (first?.external && typeof first.external.url === 'string') {
        return first.external.url;
      }
    }
  }
  return undefined;
}

function getCheckboxValue(properties: Record<string, unknown>, key: string): boolean {
  const prop = properties[key];
  if (prop && typeof prop === 'object' && 'checkbox' in prop) {
    const cbProp = prop as { checkbox?: unknown };
    return typeof cbProp.checkbox === 'boolean' ? cbProp.checkbox : false;
  }
  return false;
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

/**
 * 指定されたSourceQueryに一致する全レコードをNotionデータベースから取得
 */
export async function queryNotionDatabase(sourceQuery: string): Promise<NotionRecord[]> {
  const apiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!apiKey || !databaseId) {
    throw new Error('Missing NOTION_API_KEY or NOTION_DATABASE_ID environment variables');
  }

  const notion = new Client({ auth: apiKey });
  const records: NotionRecord[] = [];
  let hasMore = true;
  let startCursor: string | undefined = undefined;

  while (hasMore) {
    // Use Notion SDK consistently (databases.query is available in SDK v2+)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await (notion.databases as any).query({
      database_id: databaseId,
      filter: {
        property: 'SourceQuery',
        select: {
          equals: sourceQuery,
        },
      },
      start_cursor: startCursor,
      page_size: 100,
    });

    for (const page of response.results) {
      if (!('properties' in page)) continue;

      const properties = page.properties as Record<string, unknown>;
      
      // 型ガードヘルパーを使用して安全にプロパティを取得
      const title = getTitleValue(properties, '名前');
      const url = getUrlValue(properties, 'URL');
      const price = getRichTextValue(properties, '価格');
      const thumbnailUrl = getFilesExternalUrl(properties, 'サムネイル');
      const isNoise = getCheckboxValue(properties, 'IsNoise');

      records.push({
        pageId: page.id,
        title,
        url,
        price,
        thumbnailUrl,
        isNoise,
      });
    }

    hasMore = response.has_more;
    startCursor = response.next_cursor ?? undefined;
  }

  console.log(`[NotionClient] Queried ${records.length} records for SourceQuery: ${sourceQuery}`);
  return records;
}

/**
 * 差分データを別のNotionデータベースに書き込む
 */
export async function addDiffItemToNotion(item: DiffItem): Promise<void> {
  const apiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DIFF_DATABASE_ID;

  if (!apiKey || !databaseId) {
    throw new Error('Missing NOTION_API_KEY or NOTION_DIFF_DATABASE_ID environment variables');
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
        'DiffType': {
          select: {
            name: item.diffType,
          },
        },
        'IsNoise': {
          checkbox: item.isNoise,
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
    console.log(`[NotionClient] Added diff: ${item.title} (${item.diffType})`);
  } catch (error) {
    console.error(`[NotionClient] Failed to add diff item: ${item.title}`, error);
    throw error;
  }
}
