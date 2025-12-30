import { config as dotenvConfig } from 'dotenv';
import { queryNotionDatabase, addDiffItemToNotion, type NotionRecord, type DiffItem } from '../lib/notion-client.js';

// Load environment variables
dotenvConfig();

// 設定値: 比較するSourceQuery
const BASE_QUERY = '全検索';        // 比較基準（全文検索）
const TARGET_QUERY = '3Dモデル';     // 比較対象（任意のプロパティ）- 変更可能

async function compareQueries() {
  console.log('Starting URL diff comparison process...');
  console.log(`Base Query: ${BASE_QUERY}`);
  console.log(`Target Query: ${TARGET_QUERY}`);

  // 環境変数のバリデーション
  if (!process.env.NOTION_API_KEY || !process.env.NOTION_DATABASE_ID) {
    console.error('Error: NOTION_API_KEY and NOTION_DATABASE_ID must be set in .env');
    process.exit(1);
  }

  if (!process.env.NOTION_DIFF_DATABASE_ID) {
    console.error('Error: NOTION_DIFF_DATABASE_ID must be set in .env');
    process.exit(1);
  }

  try {
    // 1. BASE_QUERYのデータを取得
    console.log(`\nFetching records for: ${BASE_QUERY}`);
    const baseRecords = await queryNotionDatabase(BASE_QUERY);

    // 2. TARGET_QUERYのデータを取得
    console.log(`\nFetching records for: ${TARGET_QUERY}`);
    const targetRecords = await queryNotionDatabase(TARGET_QUERY);

    // 3. URLをキーとしたMapを作成
    const baseUrlMap = new Map<string, NotionRecord>();
    for (const record of baseRecords) {
      if (record.url) {
        baseUrlMap.set(record.url, record);
      }
    }

    const targetUrlMap = new Map<string, NotionRecord>();
    for (const record of targetRecords) {
      if (record.url) {
        targetUrlMap.set(record.url, record);
      }
    }

    // 4. 差分を計算
    const diffItems: DiffItem[] = [];

    // BASE_QUERYにのみ存在するURL
    for (const [url, record] of baseUrlMap) {
      if (!targetUrlMap.has(url)) {
        diffItems.push({
          title: record.title,
          url: record.url,
          price: record.price,
          thumbnailUrl: record.thumbnailUrl,
          diffType: '全検索のみ',
          isNoise: record.isNoise,
        });
      }
    }

    // TARGET_QUERYにのみ存在するURL
    for (const [url, record] of targetUrlMap) {
      if (!baseUrlMap.has(url)) {
        diffItems.push({
          title: record.title,
          url: record.url,
          price: record.price,
          thumbnailUrl: record.thumbnailUrl,
          diffType: 'プロパティのみ',
          isNoise: record.isNoise,
        });
      }
    }

    console.log(`\n=== Diff Summary ===`);
    console.log(`${BASE_QUERY} records: ${baseRecords.length}`);
    console.log(`${TARGET_QUERY} records: ${targetRecords.length}`);
    console.log(`${BASE_QUERY}のみ: ${diffItems.filter(d => d.diffType === '全検索のみ').length}`);
    console.log(`${TARGET_QUERY}のみ: ${diffItems.filter(d => d.diffType === 'プロパティのみ').length}`);
    console.log(`Total diff items: ${diffItems.length}`);

    // 5. 差分データを新しいデータベースに書き込む
    if (diffItems.length > 0) {
      console.log(`\nWriting ${diffItems.length} diff items to Notion...`);
      
      for (const item of diffItems) {
        try {
          await addDiffItemToNotion(item);
        } catch (error) {
          console.error(`Failed to write diff item: ${item.url}`, error);
        }
      }
      
      console.log('Diff items written successfully.');
    } else {
      console.log('\nNo differences found between the two queries.');
    }

  } catch (error) {
    console.error('Error during comparison:', error);
    process.exit(1);
  }

  console.log('\nComparison process completed.');
}

compareQueries().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
