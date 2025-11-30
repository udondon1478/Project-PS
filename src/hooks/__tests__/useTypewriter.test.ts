import { renderHook, act } from '@testing-library/react';
import { useTypewriter } from '../useTypewriter';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('useTypewriter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should type out text', () => {
    const { result } = renderHook(() =>
      useTypewriter({
        texts: ['Hello'],
        typingSpeed: 100,
        deletingSpeed: 50,
        pauseDuration: 1000,
      })
    );

    expect(result.current).toBe('');

    // Advance time to type 'H'
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('H');

    // Advance time to type remaining 'ello'
    // We need to advance incrementally because each character triggers a re-render and effect schedule
    for (let i = 0; i < 4; i++) {
      act(() => {
        vi.advanceTimersByTime(100);
      });
    }
    expect(result.current).toBe('Hello');
  });

  it('should pause and then delete text', () => {
    const { result } = renderHook(() =>
      useTypewriter({
        texts: ['Hi'],
        typingSpeed: 100,
        deletingSpeed: 50,
        pauseDuration: 1000,
      })
    );

    // Type 'Hi' (2 chars * 100ms = 200ms)
    for (let i = 0; i < 2; i++) {
      act(() => {
        vi.advanceTimersByTime(100);
      });
    }
    expect(result.current).toBe('Hi');

    // Advance pause duration (1000ms)
    act(() => {
      vi.advanceTimersByTime(1000); // Trigger pause completion AND first deletion
    });
    expect(result.current).toBe('H');

    // 'H' -> ''
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current).toBe('');
  });

  it('should loop to the next text', () => {
    const { result } = renderHook(() =>
      useTypewriter({
        texts: ['A', 'B'],
        typingSpeed: 100,
        deletingSpeed: 50,
        pauseDuration: 1000,
      })
    );

    // Type 'A'
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('A');

    // Pause and delete 'A'
    act(() => {
      vi.advanceTimersByTime(1000); // Trigger pause completion AND deletion
    });
    expect(result.current).toBe('');

    // Advance timers to switch to 'B' and type next char.
    // Split advance allows the effect to run and schedule a new timer.
    act(() => {
      vi.advanceTimersByTime(50); // Trigger switch
    });
    
    act(() => {
      vi.advanceTimersByTime(200); // Trigger next char
    });
    expect(result.current).toBe('B');
  });

  it('should clear timer on unmount', () => {
    const { unmount } = renderHook(() =>
      useTypewriter({
        texts: ['Test'],
        typingSpeed: 100,
      })
    );

    unmount();
    
    // Verify no errors or state updates
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  });
});
