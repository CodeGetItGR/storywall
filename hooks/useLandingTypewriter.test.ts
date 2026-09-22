import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useLandingTypewriter } from '@/hooks/useLandingTypewriter';

const WORDS = ['wedding', 'party'];

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

// Each character needs its own flush: the next timer is only scheduled once
// React has re-rendered with the longer slice.
function typeFor(characters: number) {
    for (let step = 0; step < characters; step += 1) act(() => void vi.advanceTimersByTime(92));
}

describe('useLandingTypewriter', () => {
    it('types the word out one character at a time', () => {
        const { result } = renderHook(() => useLandingTypewriter(WORDS));
        expect(result.current).toBe('w');
        typeFor(3);
        expect(result.current).toBe('wedd');
    });

    it('moves on to the next word after holding the finished one', () => {
        const { result } = renderHook(() => useLandingTypewriter(WORDS));
        typeFor(6);
        expect(result.current).toBe('wedding');
        act(() => void vi.advanceTimersByTime(1250));
        expect(result.current).toBe('p');
    });

    it('settles on the whole word when paused and stays there', () => {
        const { result, rerender } = renderHook(({ paused }) => useLandingTypewriter(WORDS, paused), {
            initialProps: { paused: false },
        });
        typeFor(2);
        expect(result.current).toBe('wed');

        rerender({ paused: true });
        expect(result.current).toBe('wedding');
        act(() => void vi.advanceTimersByTime(5000));
        expect(result.current).toBe('wedding');
    });

    it('carries on to the next word once resumed', () => {
        const { result, rerender } = renderHook(({ paused }) => useLandingTypewriter(WORDS, paused), {
            initialProps: { paused: false },
        });
        typeFor(2);
        rerender({ paused: true });
        act(() => void vi.advanceTimersByTime(5000));

        rerender({ paused: false });
        act(() => void vi.advanceTimersByTime(1250));
        expect(result.current).toBe('p');
    });

});
