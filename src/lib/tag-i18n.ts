import { prisma } from '@/lib/prisma';
import { Tag } from '@prisma/client';

/**
 * Returns the localized name of a tag based on the user's preferred language.
 * Checks for direct translation or reverse translation relationships.
 * Falls back to the original tag name if no translation is found.
 *
 * @param tag - The Tag object to localize.
 * @param userLanguage - The user's preferred language code (e.g., 'ja', 'en').
 * @returns A Promise that resolves to the localized tag name string.
 */
export async function getLocalizedTagName(
  tag: Tag,
  userLanguage: string // 'ja' | 'en' but typed as string in User model
): Promise<string> {
  // タグ自体の言語がユーザー言語と一致する場合
  if (tag.language === userLanguage) {
    return tag.displayName || tag.name;
  }
  
  // 翻訳関係を検索 (双方向)
  const translation = await prisma.tagTranslation.findFirst({
    where: {
      OR: [
        { sourceTagId: tag.id, translatedTag: { language: userLanguage } },
        { translatedTagId: tag.id, sourceTag: { language: userLanguage } }
      ]
    },
    include: { sourceTag: true, translatedTag: true }
  });

  if (translation) {
    const resolved =
      translation.translatedTag?.language === userLanguage
        ? translation.translatedTag
        : translation.sourceTag;
    if (resolved) {
      return resolved.displayName || resolved.name;
    }
  }

  // フォールバック: 元のタグ名
  return tag.displayName || tag.name;
}

/**
 * Batch fetches localized names for multiple tags.
 */
export async function getLocalizedTagNames(
  tags: { id: string; language: string | null; displayName: string | null; name: string }[],
  userLanguage: string
): Promise<Map<string, string>> {
  const uniqueTagIds = [...new Set(tags.map(t => t.id))];
  
  const translations = await prisma.tagTranslation.findMany({
    where: {
      OR: [
        { sourceTagId: { in: uniqueTagIds }, translatedTag: { language: userLanguage } },
        { translatedTagId: { in: uniqueTagIds }, sourceTag: { language: userLanguage } }
      ]
    },
    include: { sourceTag: true, translatedTag: true }
  });

  const map = new Map<string, string>();
  for (const tr of translations) {
     if (tr.translatedTag?.language === userLanguage) {
        map.set(tr.sourceTagId, tr.translatedTag.displayName || tr.translatedTag.name);
     } else if (tr.sourceTag?.language === userLanguage) {
        map.set(tr.translatedTagId, tr.sourceTag.displayName || tr.sourceTag.name);
     }
  }
  return map;
}
