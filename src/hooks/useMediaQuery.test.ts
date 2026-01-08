import { renderHook } from '@testing-library/react';
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
    process.env.NODE_ENV = 'development';
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    window.matchMedia = vi.fn().mockImplementation(() => {
      throw new Error('Invalid media query start');
    });

    const { result } = renderHook(() => useMediaQuery('invalid-query'));
    
    expect(result.current).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
  });
});
