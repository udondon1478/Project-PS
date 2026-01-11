import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useGuidelineFirstVisit } from '../useGuidelineFirstVisit';

describe('useGuidelineFirstVisit', () => {
  const pageId = 'test-page';
  const storageKey = `guideline-onboarding-shown-${pageId}`;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return true initially (SSR/hydration match)', () => {
    const { result } = renderHook(() => useGuidelineFirstVisit(pageId));
    expect(result.current).toBe(true);
  });

  it('should set localStorage and keep true if it is the first visit', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

    const { result } = renderHook(() => useGuidelineFirstVisit(pageId));

    // Initially true
    expect(result.current).toBe(true);

    // Should have checked localStorage
    expect(getItemSpy).toHaveBeenCalledWith(storageKey);
    // Should have set localStorage
    expect(setItemSpy).toHaveBeenCalledWith(storageKey, 'true');
  });

  it('should return false if localStorage has the key (subsequent visit)', () => {
    // Setup: already visited
    localStorage.setItem(storageKey, 'true');
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

    const { result } = renderHook(() => useGuidelineFirstVisit(pageId));
    
    // It starts as true (for hydration matching) but updates to false in useEffect
    expect(result.current).toBe(false);
    expect(getItemSpy).toHaveBeenCalledWith(storageKey);
  });

  it('should handle localStorage errors gracefully', () => {
    // Simulate localStorage error (e.g., Safari private mode)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    // We also need to mock getItem to not crash if code calls it, 
    // though the error here is specifically about setItem in the catch block 
    // or initially checks.
    // The current code calls getItem in initializer (which will throw if we mock it to throw or if access is denied)
    // AND setItem in useEffect.

    // If we want to simulate the useEffect error:
    const { result } = renderHook(() => useGuidelineFirstVisit(pageId));

    // Should not crash and remain true (first visit behavior)
    expect(result.current).toBe(true);
  });
});
