import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from './useMediaQuery';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('useMediaQuery', () => {
  const originalMatchMedia = window.matchMedia;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should return matches based on media query', () => {
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useMediaQuery('(min-width: 600px)'));
    expect(result.current).toBe(true);
  });

  it('should handle errors gracefully when matchMedia throws', () => {
    // Mock NODE_ENV to 'development' to trigger console.warn
    vi.stubEnv('NODE_ENV', 'development');
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    window.matchMedia = vi.fn().mockImplementation(() => {
      throw new Error('Invalid media query start');
    });

    const { result } = renderHook(() => useMediaQuery('invalid-query'));
    
    expect(result.current).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should subscribe and unsubscribe to media query changes', () => {
    const addEventListenerMock = vi.fn();
    const removeEventListenerMock = vi.fn();
    
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
      dispatchEvent: vi.fn(),
    }));

    const { unmount } = renderHook(() => useMediaQuery('(min-width: 600px)'));
    
    expect(addEventListenerMock).toHaveBeenCalledTimes(1);
    expect(addEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));

    unmount();
    
    expect(removeEventListenerMock).toHaveBeenCalledTimes(1);
    expect(removeEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should update value when media query changes', () => {
    let changeHandler: ((e: MediaQueryListEvent) => void) | null = null;
    
    const mediaMock = {
      matches: false,
      media: '(min-width: 600px)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'change') {
          changeHandler = listener as (e: MediaQueryListEvent) => void;
        }
      },
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };

    window.matchMedia = vi.fn().mockImplementation(() => mediaMock);

    const { result } = renderHook(() => useMediaQuery('(min-width: 600px)'));
    expect(result.current).toBe(false);

    // Update the mock state before triggering listener
    mediaMock.matches = true;

    // Simulate media query change
    if (changeHandler) {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      act(() => {
        (changeHandler as any)({ matches: true, media: '(min-width: 600px)' });
      });
    }

    expect(result.current).toBe(true);
  });

  it('should handle query updates', () => {
    const removeEventListenerMock = vi.fn();
    const addEventListenerMock = vi.fn();

    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
      dispatchEvent: vi.fn(),
    }));

    const { rerender } = renderHook(({ query }) => useMediaQuery(query), {
      initialProps: { query: '(min-width: 600px)' },
    });

    expect(addEventListenerMock).toHaveBeenCalledTimes(1);

    // Change query prop
    rerender({ query: '(min-width: 601px)' });
    
    // Should remove old listener and add new one
    expect(removeEventListenerMock).toHaveBeenCalledTimes(1);
    expect(addEventListenerMock).toHaveBeenCalledTimes(2);
  });


});
