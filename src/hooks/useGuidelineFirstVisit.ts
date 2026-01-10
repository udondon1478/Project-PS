import { useState, useEffect } from 'react';

/**
 * ページごとのオンボーディング表示判定フック
 * @param page ページ識別子 (例: 'register', 'edit')
 * @returns 初回訪問かどうか
 */
export function useGuidelineFirstVisit(page: string): boolean {
  const [isFirstVisit, setIsFirstVisit] = useState(() => {
    if (typeof window === 'undefined') return false;

    try {
      const key = `guideline-onboarding-shown-${page}`;
      return !localStorage.getItem(key);
    } catch (error) {
      // LocalStorage無効時は常に初回扱い
      console.warn('localStorage unavailable:', error);
      return true;
    }
  });

  useEffect(() => {
    if (isFirstVisit && typeof window !== 'undefined') {
      try {
        const key = `guideline-onboarding-shown-${page}`;
        localStorage.setItem(key, 'true');
      } catch (error) {
        // エラーは無視（プライベートモード等）
        console.warn('Failed to save onboarding state:', error);
      }
    }
    // isFirstVisitは初期化時のみ設定され、このフック内では変更されないため依存配列から除外しても安全
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return isFirstVisit;
}
