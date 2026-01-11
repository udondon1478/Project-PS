import { renderHook, act } from '@testing-library/react';
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
    const [isFirstVisit] = result.current;
    expect(isFirstVisit).toBe(true);
  });

  it('should NOT set localStorage automatically even if it is the first visit', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

    const { result } = renderHook(() => useGuidelineFirstVisit(pageId));
    const [isFirstVisit] = result.current;

    // Initially true
    expect(isFirstVisit).toBe(true);

    // Should have checked localStorage
    expect(getItemSpy).toHaveBeenCalledWith(storageKey);
    // Should NOT have set localStorage yet
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it('should set localStorage only when markAsVisited is called', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const { result } = renderHook(() => useGuidelineFirstVisit(pageId));
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, markAsVisited] = result.current;

    act(() => {
      markAsVisited();
    });

    expect(setItemSpy).toHaveBeenCalledWith(storageKey, 'true');
    
    // Check state update
    expect(result.current[0]).toBe(false);
  });

  it('should return false if localStorage has the key (subsequent visit)', () => {
    // Setup: already visited
    localStorage.setItem(storageKey, 'true');
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

    const { result } = renderHook(() => useGuidelineFirstVisit(pageId));
    const [isFirstVisit] = result.current;
    
    // It starts as true (for hydration matching) but updates to false in useEffect
    expect(isFirstVisit).toBe(false);
    expect(getItemSpy).toHaveBeenCalledWith(storageKey);
  });

  it('should handle localStorage errors gracefully', () => {
    // Simulate localStorage error
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const { result } = renderHook(() => useGuidelineFirstVisit(pageId));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, markAsVisited] = result.current;

    // Should not crash when calling markAsVisited
    act(() => {
      markAsVisited();
    });

    // Determine expected behavior: currently code just logs error and sets state
    expect(result.current[0]).toBe(false);
  });
});
