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
   */
  async resolveTags(tagNames: string[]): Promise<string[]> {
    const normalizedNames = [...new Set(tagNames.map(this.normalizeTagName))];
    if (normalizedNames.length === 0) return [];

    // 1. Find existing tags
    const existingTags = await this.db.tag.findMany({
      where: {
        name: { in: normalizedNames },
      },
      select: { id: true, name: true },
    });

    const existingTagNames = new Set(existingTags.map(t => t.name));
    const existingTagIds = existingTags.map(t => t.id);

    // 2. Create missing tags
    const missingTagNames = normalizedNames.filter(name => !existingTagNames.has(name));
    
    const newTagIds: string[] = [];
    
    // Create tags sequentially
    for (const name of missingTagNames) {
      try {
        const newTag = await this.db.tag.create({
          data: {
            name,
            language: this.defaultLanguage,
          },
          select: { id: true },
        });
        newTagIds.push(newTag.id);
      } catch (error) {
        // Tag might have been created by another process in the meantime
        // Try fetching it again
        const existing = await this.db.tag.findUnique({
          where: { name },
          select: { id: true },
        });
        if (existing) {
          newTagIds.push(existing.id);
        } else {
          throw new Error(`Failed to create or find tag ${name}: ${error}`);
        }
      }
    }

    return [...existingTagIds, ...newTagIds];
  }

  /**
   * 年齢制限文字列 (adult, r15, all_ages etc.) を受け取り、対応するTag IDを返す。
   * 年齢制限用カテゴリが存在しない場合は作成する。
   */
  async resolveAgeRating(rating: string | null): Promise<string | null> {
    if (!rating) return null;

    const normalizedRating = this.normalizeTagName(rating);

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
    return name.trim();
  }
}
