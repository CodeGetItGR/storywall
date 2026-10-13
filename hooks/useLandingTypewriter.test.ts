import { act, renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useLandingTypewriter } from '@/hooks/useLandingTypewriter';

const WORDS = ['wedding', 'party'];

function setPrefersReducedMotion(matches: boolean) {
    window.matchMedia = vi.fn().mockReturnValue({
        matches,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
    vi.useFakeTimers();
    setPrefersReducedMotion(false);
});
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

    it('hydrates on the first letter and then shows the whole word for reduced motion', () => {
        setPrefersReducedMotion(true);
        function Typewriter() {
            return createElement('span', null, useLandingTypewriter(WORDS));
        }
        const container = document.createElement('div');
        container.innerHTML = renderToString(createElement(Typewriter));
        expect(container.textContent).toBe('w');

        const onRecoverableError = vi.fn();
        const renders: string[] = [];
        const { result } = renderHook(
            () => {
                const word = useLandingTypewriter(WORDS);
                renders.push(word);
                return word;
            },
            { container, hydrate: true, onRecoverableError },
        );

        expect(renders[0]).toBe('w');
        expect(result.current).toBe('wedding');
        expect(onRecoverableError).not.toHaveBeenCalled();
        act(() => void vi.advanceTimersByTime(5000));
        expect(result.current).toBe('wedding');
    });
});
