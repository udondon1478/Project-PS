import { useState, useEffect, useCallback } from 'react';

/**
 * ページごとのオンボーディング表示判定フック
 * @param page ページ識別子 (例: 'register_item', 'edit')
 * @returns [isFirstVisit, markAsVisited]
 * isFirstVisit: 初回訪問かどうか (true: 初回, false: 2回目以降)
 * markAsVisited: 訪問済みとしてマークする関数 (これを呼び出すと次回以降 isFirstVisit が false になる)
 */
export function useGuidelineFirstVisit(page: string): [boolean, () => void] {
  // 常に初期値をtrueにする（SSR/ハイドレーション不一致回避のため）
  const [isFirstVisit, setIsFirstVisit] = useState(true);

  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window === 'undefined') return;

    try {
      const key = `guideline-onboarding-shown-${page}`;
      const hasShown = localStorage.getItem(key);

      if (hasShown) {
        // 既に表示済みの場合はfalseに更新
        setIsFirstVisit(false);
      }
      // まだ表示していない場合でも、自動的にマークはしない
      // 呼び出し元が markAsVisited() を実行したタイミングでマークする
    } catch (error) {
      console.warn('Failed to access localStorage:', error);
      // エラー時は初期値(true)のまま維持
    }
  }, [page]);

  const markAsVisited = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const key = `guideline-onboarding-shown-${page}`;
      localStorage.setItem(key, 'true');
    } catch (error) {
      console.warn('Failed to write to localStorage:', error);
    }
    // Storageへの書き込み成否に関わらず、現在のセッションでは「訪問済み」とする
    setIsFirstVisit(false);
  }, [page]);

  return [isFirstVisit, markAsVisited];
}
