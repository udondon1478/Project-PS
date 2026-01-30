import { useState, useEffect } from 'react';
import { getAvatarDefinitionsMap } from '@/app/actions/avatar-items';
import type { AvatarDefinition } from '@/lib/avatars';

interface UseAvatarDetectionProps {
  description: string;
  currentTags: string[];
  /**
   * 提案するタグのサフィックスリスト
   * デフォルト: ['', '対応'] (アバター名そのものと、"対応"付き)
   */
  suffixes?: string[];
}

const DEFAULT_SUFFIXES = ['', '対応'];

export function useAvatarDetection({
  description,
  currentTags,
  suffixes = DEFAULT_SUFFIXES,
}: UseAvatarDetectionProps) {
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

      // ID check (case sensitive inclusion match for numeric BOOTH item IDs)
      const hasId = description.includes(itemId);

      // Name check (case insensitive)
      const hasName = normalizedDescription.includes(avatarName.toLowerCase());

      // Alias check (case insensitive)
      const hasAlias = aliases.some(alias =>
        normalizedDescription.includes(alias.toLowerCase())
      );

      if (hasId || hasName || hasAlias) {
        for (const suffix of suffixes) {
            const tagName = `${avatarName}${suffix}`;
            if (!currentTags.includes(tagName)) {
                foundTags.add(tagName);
            }
        }
      }
    }

    setSuggestedTags(Array.from(foundTags));
  }, [description, definitions, isLoaded, currentTags, suffixes]);

  return { suggestedTags, isLoaded };
}
