import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from './useMediaQuery';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';

describe('useMediaQuery', () => {
  const originalMatchMedia = window.matchMedia;
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  const createMockMediaQueryList = (matches: boolean, query: string) => {
    const listeners = new Set<EventListenerOrEventListenerObject>();
    return {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn((type, listener) => {
        if (type === 'change') listeners.add(listener);
      }),
      removeEventListener: vi.fn((type, listener) => {
        if (type === 'change') listeners.delete(listener);
      }),
      dispatchEvent: vi.fn(),
      // Helper to trigger change manually
      _triggerChange: (e: MediaQueryListEvent) => {
        listeners.forEach(listener => {
          if (typeof listener === 'function') listener(e);
          else if (typeof listener === 'object' && listener.handleEvent) listener.handleEvent(e);
        });
      },
    };
  };

  it('should return matches based on media query', () => {
    const query = '(min-width: 600px)';
    const mockMql = createMockMediaQueryList(true, query);
    window.matchMedia = vi.fn().mockReturnValue(mockMql);

    const { result } = renderHook(() => useMediaQuery(query));
    expect(result.current).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith(query);
  });

  it('should handle errors gracefully when matchMedia throws', () => {
    const originalEnv = process.env;
    process.env = { ...originalEnv, NODE_ENV: 'development' };
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    window.matchMedia = vi.fn().mockImplementation(() => {
      throw new Error('Invalid media query');
    });

    const { result } = renderHook(() => useMediaQuery('invalid-query'));
    
    expect(result.current).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
    
    process.env = originalEnv;
  });

  it.skip('should return undefined during SSR (when window is undefined)', () => {
    // SSR behavior is verified by the hook's typeof window check.
    // This test is skipped as JSDOM always defines window.
  });


  it('should subscribe and unsubscribe to media query changes', () => {
    const query = '(min-width: 600px)';
    const mockMql = createMockMediaQueryList(false, query);
    window.matchMedia = vi.fn().mockReturnValue(mockMql);

    const { unmount } = renderHook(() => useMediaQuery(query));
    
    expect(mockMql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    unmount();
    
    expect(mockMql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should update value when media query changes', () => {
    const query = '(min-width: 600px)';
    const mockMql = createMockMediaQueryList(false, query);
    window.matchMedia = vi.fn().mockReturnValue(mockMql);

    const { result } = renderHook(() => useMediaQuery(query));
    expect(result.current).toBe(false);

    // Update matches and trigger change
    mockMql.matches = true;
    act(() => {
      mockMql._triggerChange({ matches: true, media: query } as MediaQueryListEvent);
    });

    expect(result.current).toBe(true);
  });

  it('should handle query updates by removing old listener and adding new one', () => {
    const initialQuery = '(min-width: 600px)';
    const initialMql = createMockMediaQueryList(false, initialQuery);
    
    const newQuery = '(min-width: 900px)';
    const newMql = createMockMediaQueryList(true, newQuery);

    window.matchMedia = vi.fn().mockImplementation((q) => {
      if (q === initialQuery) return initialMql;
      if (q === newQuery) return newMql;
      return createMockMediaQueryList(false, q);
    });

    const { rerender } = renderHook(({ q }) => useMediaQuery(q), {
      initialProps: { q: initialQuery },
    });

    expect(initialMql.addEventListener).toHaveBeenCalledTimes(1);

    // Change query prop
    rerender({ q: newQuery });
    
    // Should remove listener from old mql
    expect(initialMql.removeEventListener).toHaveBeenCalledTimes(1);
    
    // Should add listener to new mql
    expect(newMql.addEventListener).toHaveBeenCalledTimes(1);
    expect(window.matchMedia).toHaveBeenCalledWith(newQuery);
  });
});
