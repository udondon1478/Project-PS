import { useState, useEffect } from 'react';
import { getAvatarDefinitionsMap } from '@/app/actions/avatar-items';

interface UseAvatarDetectionProps {
  description: string;
  currentTags: string[];
}

export function useAvatarDetection({ description, currentTags }: UseAvatarDetectionProps) {
  const [definitions, setDefinitions] = useState<Record<string, string>>({});
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

    // 定義辞書をループして、IDが説明文に含まれているかチェック
    // 定義数が数千件程度ならクライアントサイドでも十分高速に動作する
    for (const [itemId, avatarName] of Object.entries(definitions)) {
      if (description.includes(itemId)) {
        // 現在のタグに含まれていない場合のみ提案
        // 大文字小文字の違いを考慮してチェックするのも良いが、今回は単純一致と既存ロジックに合わせる
        // TagInput側では大文字小文字を区別しているか確認が必要だが、一旦単純比較
        if (!currentTags.includes(avatarName)) {
            foundTags.add(avatarName);
        }
      }
    }

    setSuggestedTags(Array.from(foundTags));
  }, [description, definitions, isLoaded, currentTags]);

  return { suggestedTags, isLoaded };
}
