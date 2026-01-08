'use client';

import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const media = window.matchMedia(query);

    // 初期値の設定
    setMatches(media.matches);

    // リスナーの設定
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);

    // クリーンアップ
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
