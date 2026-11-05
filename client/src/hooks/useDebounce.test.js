// Tests for useDebounce — the hook that stops the client search box firing one
// API request per keystroke. Uses fake timers so the test doesn't actually wait.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './useDebounce.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useDebounce', () => {
  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('acme', 300));
    expect(result.current).toBe('acme');
  });

  it('does not update until the delay has elapsed', () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), {
      initialProps: { v: '' },
    });

    rerender({ v: 'a' });
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe(''); // still the old value

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('a');
  });

  it('collapses rapid typing into a single final update', () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), {
      initialProps: { v: '' },
    });

    // Each keystroke lands well inside the window, so none of them settle.
    for (const v of ['s', 'st', 'sta', 'star', 'stark']) {
      rerender({ v });
      act(() => vi.advanceTimersByTime(50));
    }
    expect(result.current).toBe('');

    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('stark'); // only the last value survives
  });
});
