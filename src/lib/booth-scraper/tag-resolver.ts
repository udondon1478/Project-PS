import { prisma as globalPrisma } from '../prisma';
import type { Prisma, PrismaClient } from '@prisma/client';

type TxClient = Prisma.TransactionClient | PrismaClient;

export class TagResolver {
  private ageRatingCategoryName = 'age_rating';
  private defaultLanguage = 'ja';
  private db: TxClient;

  constructor(db: TxClient = globalPrisma) {
    this.db = db;
  }

  /**
   * タグ名の配列を受け取り、Tag IDの配列を返す。
   * 存在しないタグは新規作成される。
   * 大文字小文字の違いは同一タグとして扱い、最初の出現形式を displayName として保持する。
   */
  async resolveTags(tagNames: string[]): Promise<string[]> {
    // Map: normalized name → original display name (first wins)
    const deduplicatedMap = new Map<string, string>();
    for (const name of tagNames) {
      const normalized = this.normalizeTagName(name);
      if (!deduplicatedMap.has(normalized)) {
        deduplicatedMap.set(normalized, name); // 最初の出現を保持
      }
    }

    const normalizedNames = [...deduplicatedMap.keys()];
    if (normalizedNames.length === 0) return [];

    // 1. Find existing tags
    const existingTags = await this.db.tag.findMany({
      where: {
        name: { in: normalizedNames },
      },
      select: { id: true, name: true, displayName: true },
    });

    // Map for quick lookup: normalized name → tag id
    const existingTagMap = new Map(existingTags.map(t => [t.name, t.id]));

    // 2. Create missing tags
    const missingEntries = [...deduplicatedMap.entries()]
      .filter(([normalized]) => !existingTagMap.has(normalized));

    const createdTagMap = new Map<string, string>();

    // Create tags in parallel
    await Promise.all(
      missingEntries.map(async ([normalized, displayName]) => {
        try {
          const newTag = await this.db.tag.create({
            data: {
              name: normalized,
              displayName: displayName,
              language: this.defaultLanguage,
            },
            select: { id: true },
          });
          createdTagMap.set(normalized, newTag.id);
        } catch (error) {
          // Tag might have been created by another process in the meantime
          // Try fetching it again
          const existing = await this.db.tag.findUnique({
            where: { name: normalized },
            select: { id: true, displayName: true },
          });
          if (existing) {
            createdTagMap.set(normalized, existing.id);
          } else {
            console.error(`Failed to create or find tag: ${normalized}`, error);
            throw new Error(`Failed to create or find tag: ${normalized}`);
          }
        }
      })
    );

    // 2.5 Update existing tags missing displayName
    const tagsToUpdate = existingTags.filter(t => !t.displayName);
    await Promise.all(

        tagsToUpdate.map(async (t) => {

             // Find original display name from deduplicatedMap
             const originalDisplayName = deduplicatedMap.get(t.name);
             if (originalDisplayName && originalDisplayName !== t.name && originalDisplayName !== t.displayName) {
                 try {
                     await this.db.tag.update({

                         where: { id: t.id },
                         data: { displayName: originalDisplayName }
                     });
                 } catch (e) {
                     console.warn(`Failed to backfill displayName for tag ${t.name}:`, e);
                 }
             }
        })
    );

    // 3. Return IDs in order of deduplicatedMap entries
    return [...deduplicatedMap.keys()].map(normalized => {
      const tagId = existingTagMap.get(normalized) ?? createdTagMap.get(normalized);
      if (tagId === undefined) {
        throw new Error(`Tag ID not found for normalized key: ${normalized}`);
      }
      return tagId;
    });
  }

  /**
   * 年齢制限文字列 (adult, r15, all_ages etc.) を受け取り、対応するTag IDを返す。
   * 年齢制限用カテゴリが存在しない場合は作成する。
   */
  async resolveAgeRating(rating: string | null): Promise<string | null> {
    if (!rating) return null;

    let normalizedRating = this.normalizeTagName(rating);
    
    // Map internal codes to standard Japanese tags
    const ratingMap: Record<string, string> = {
        'all_ages': '全年齢',
        'adult': 'R-18',
        'r15': 'R-15',
    };

    const lowerRating = normalizedRating.toLowerCase();
    if (lowerRating in ratingMap) {
        normalizedRating = ratingMap[lowerRating];
    }

    // Ensure category exists
    let category = await this.db.tagCategory.findUnique({
      where: { name: this.ageRatingCategoryName },
    });

    if (!category) {
      // Create 'age_rating' category if not exists
      try {
          category = await this.db.tagCategory.create({
              data: {
                  name: this.ageRatingCategoryName,
                  color: '#FF0000', // Default red for age ratings
              }
          });
      } catch (e) {
          // Race condition check
          category = await this.db.tagCategory.findUnique({
             where: { name: this.ageRatingCategoryName },
          });
      }
    }

    if (!category) throw new Error('Failed to ensure age_rating category');

    // Find or Create Tag linked to this category
    let tag = await this.db.tag.findUnique({
      where: { name: normalizedRating },
    });

    if (!tag) {
       try {
        tag = await this.db.tag.create({
            data: {
                name: normalizedRating,
                language: 'ja', // Age ratings are now standardized Japanese tags like 'R-18'
                tagCategoryId: category.id
            }
        });
       } catch(e) {
           try {
               tag = await this.db.tag.findUnique({ where: { name: normalizedRating }});
           } catch (findError) {
               // Ignore find error and check tag validity below
           }
           
           if (!tag) {
               throw new Error(`Failed to ensure age_rating tag '${normalizedRating}'. Create error: ${e}`);
           }
       }
    } else {
        // If tag exists but not linked to category, link it?
        // Use requirement implies we should ensure link.
        if (tag.tagCategoryId !== category.id) {
            await this.db.tag.update({
                where: { id: tag.id },
                data: { tagCategoryId: category.id }
            });
        }
    }

    return tag ? tag.id : null;
  }

  private normalizeTagName(name: string): string {
    return name
      .normalize('NFKC')
      .toLowerCase() // 小文字に統一して大文字小文字の違いを同一視
      .replace(/\s+/g, ' ')
      .trim();
  }
}
