import { prisma } from '@/lib/prisma';
import { Tag } from '@prisma/client';

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
