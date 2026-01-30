import { useState, useEffect } from 'react';
import { getAvatarDefinitionsMap } from '@/app/actions/avatar-items';
import type { AvatarDefinition } from '@/lib/avatars';

interface UseAvatarDetectionProps {
  description: string;
  currentTags: string[];
}

export function useAvatarDetection({ description, currentTags }: UseAvatarDetectionProps) {
  const [definitions, setDefinitions] = useState<AvatarDefinition[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 初回マウント時に定義データをロード
  useEffect(() => {
    const loadDefinitions = async () => {
      const result = await getAvatarDefinitionsMap();
      if (result.success && result.data) {
        setDefinitions(result.data);
      }
      setIsLoaded(true);
    };
    loadDefinitions();
  }, []);

  // 説明文または現在のタグが変更されたら再計算
  useEffect(() => {
    if (!isLoaded || !description) {
      setSuggestedTags([]);
      return;
    }

    const foundTags = new Set<string>();
    const normalizedDescription = description.toLowerCase();

    // 定義をループして、ID、名前、エイリアスが説明文に含まれているかチェック
    for (const def of definitions) {
      const { itemId, avatarName, aliases } = def;

      // ID check (exact match usually required for IDs, but checking inclusion is standard here)
      const hasId = description.includes(itemId);

      // Name check (case insensitive)
      const hasName = normalizedDescription.includes(avatarName.toLowerCase());

      // Alias check (case insensitive)
      const hasAlias = aliases.some(alias =>
        normalizedDescription.includes(alias.toLowerCase())
      );

      if (hasId || hasName || hasAlias) {
        if (!currentTags.includes(avatarName)) {
            foundTags.add(avatarName);
        }
      }
    }

    setSuggestedTags(Array.from(foundTags));
  }, [description, definitions, isLoaded, currentTags]);

  return { suggestedTags, isLoaded };
}
