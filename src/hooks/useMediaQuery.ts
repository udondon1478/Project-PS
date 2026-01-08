'use client';

import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean | undefined {
  const [matches, setMatches] = useState<boolean | undefined>(() => {
    if (typeof window !== 'undefined') {
      try {
        return window.matchMedia(query).matches;
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Error matching media query "${query}":`, error);
        }
        return undefined;
      }
    }
    return undefined;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let media: MediaQueryList;
    try {
      media = window.matchMedia(query);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Error matching media query "${query}":`, error);
      }
      setMatches(undefined);
      return;
    }

    setMatches(media.matches);

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
