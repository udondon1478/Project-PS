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
  
  // 翻訳先として登録されているタグを検索 (source -> translated)
  // 例: tag(JP) -> translation(EN)
  const translation = await prisma.tagTranslation.findFirst({
    where: {
      sourceTagId: tag.id,
      translatedTag: { language: userLanguage }
    },
    include: { translatedTag: true }
  });
  
  if (translation) {
    return translation.translatedTag.displayName || translation.translatedTag.name;
  }
  
  // 逆方向の翻訳も検索 (translated -> source)
  // 例: tag(EN) <- translation(JP)
  // 元のタグが「翻訳先」として登録されている場合、その「ソース」がターゲット言語ならそれを返す
  const reverseTranslation = await prisma.tagTranslation.findFirst({
    where: {
      translatedTagId: tag.id,
      sourceTag: { language: userLanguage }
    },
    include: { sourceTag: true }
  });

  if (reverseTranslation) {
    return reverseTranslation.sourceTag.displayName || reverseTranslation.sourceTag.name;
  }

  // フォールバック: 元のタグ名
  return tag.displayName || tag.name;
}

/**
 * Returns the localized names of multiple tags in a single batch operation.
 * This function resolves N+1 query problems by fetching all translations at once.
 *
 * @param tags - Array of Tag objects to localize.
 * @param userLanguage - The user's preferred language code (e.g., 'ja', 'en').
 * @returns A Promise that resolves to a Map of tag IDs to localized tag names.
 */
export async function getLocalizedTagNames(
  tags: Tag[],
  userLanguage: string
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  if (tags.length === 0) {
    return result;
  }

  // Separate tags by whether they match user language
  const matchingLanguageTags = tags.filter(tag => tag.language === userLanguage);
  const nonMatchingTags = tags.filter(tag => tag.language !== userLanguage);

  // For matching language tags, use displayName or name directly
  matchingLanguageTags.forEach(tag => {
    result.set(tag.id, tag.displayName || tag.name);
  });

  if (nonMatchingTags.length === 0) {
    return result;
  }

  const nonMatchingTagIds = [...new Set(nonMatchingTags.map(tag => tag.id))];

  // Batch fetch all translations (both directions)
  const [forwardTranslations, reverseTranslations] = await Promise.all([
    // Forward: source -> translated
    prisma.tagTranslation.findMany({
      where: {
        sourceTagId: { in: nonMatchingTagIds },
        translatedTag: { language: userLanguage }
      },
      include: { translatedTag: true }
    }),
    // Reverse: translated -> source
    prisma.tagTranslation.findMany({
      where: {
        translatedTagId: { in: nonMatchingTagIds },
        sourceTag: { language: userLanguage }
      },
      include: { sourceTag: true }
    })
  ]);

  // Process forward translations
  forwardTranslations.forEach(t => {
    if (!result.has(t.sourceTagId)) {
      result.set(t.sourceTagId, t.translatedTag.displayName || t.translatedTag.name);
    }
  });

  // Process reverse translations
  reverseTranslations.forEach(t => {
    if (!result.has(t.translatedTagId)) {
      result.set(t.translatedTagId, t.sourceTag.displayName || t.sourceTag.name);
    }
  });

  // Fill in remaining tags with their original names
  tags.forEach(tag => {
    if (!result.has(tag.id)) {
      result.set(tag.id, tag.displayName || tag.name);
    }
  });

  return result;
}
