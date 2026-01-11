import { useState, useEffect } from 'react';

/**
 * ページごとのオンボーディング表示判定フック
 * @param page ページ識別子 (例: 'register', 'edit')
 * @returns 初回訪問かどうか
 */
export function useGuidelineFirstVisit(page: string): boolean {
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
      } else {
        // まだ表示していない場合は、表示済みとしてマーク（今回が初回）
        // ※ isFirstVisitは初期値trueなので更新不要
        localStorage.setItem(key, 'true');
      }
    } catch (error) {
      console.warn('Failed to access localStorage:', error);
      // エラー時は初期値(true)のまま維持
    }
  }, [page]);

  return isFirstVisit;
}
