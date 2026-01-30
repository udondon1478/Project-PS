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
        setDefinitions(result.data as unknown as AvatarDefinition[]);
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
        // 設定に基づいてタグを提案
        const targetTags: string[] = [];

        // 1. アバター名
        if (def.suggestAvatarName) {
            targetTags.push(avatarName);
        }

        // 2. 商品ID
        if (def.suggestItemId) {
            targetTags.push(itemId);
        }

        // 3. エイリアス
        if (def.suggestAliases && aliases.length > 0) {
            targetTags.push(...aliases);
        }

        // 基本ロジック: 検出されたら、設定で有効なタグ + suffixesの組み合わせを提案
        // ただし、suffixesは主に「アバター名」に対して使われることが多いが、
        // ここではシンプルに「提案対象のタグ」それぞれにサフィックスを適用するか、
        // あるいは「アバター名」だけにサフィックスを適用するか検討が必要。
        // 現状の実装維持＋設定反映の観点から、
        // 「アバター名」が有効なら従来のサフィックスロジックを適用し、
        // IDやエイリアスはそのまま追加する形にするのが自然。

        for (const tagBase of targetTags) {
            // アバター名の場合のみサフィックスを展開（従来互換）
            // または、設定で「アバター名」がOFFでもIDだけ提案したい場合があるため、
            // 「アバター名」そのものを提案リストに入れる。

            if (tagBase === avatarName) {
                 for (const suffix of suffixes) {
                    const tagName = `${avatarName}${suffix}`;
                    if (!currentTags.includes(tagName)) {
                        foundTags.add(tagName);
                    }
                }
            } else {
                // IDやエイリアスはサフィックスなしで提案
                if (!currentTags.includes(tagBase)) {
                    foundTags.add(tagBase);
                }
            }
        }
      }
    }

    setSuggestedTags(Array.from(foundTags));
  }, [description, definitions, isLoaded, currentTags, suffixes]);

  return { suggestedTags, isLoaded };
}
