import { act, renderHook } from '@testing-library/react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLightboxSlides } from '@/hooks/useLightboxSlides';

const embla = vi.hoisted(() => {
    const listeners = new Set<() => void>();
    const api = {
        selected: 0,
        on: (_: string, listener: () => void) => listeners.add(listener),
        off: (_: string, listener: () => void) => listeners.delete(listener),
        selectedScrollSnap: () => api.selected,
        scrollPrev: vi.fn(),
        scrollNext: vi.fn(),
        select(index: number) {
            api.selected = index;
            listeners.forEach((listener) => listener());
        },
    };
    return { api, options: vi.fn() };
});

vi.mock('embla-carousel-react', () => ({
    default: (options: unknown) => {
        embla.options(options);
        return [vi.fn(), embla.api];
    },
}));

const keyEvent = (key: string) => ({ key }) as KeyboardEvent;

beforeEach(() => {
    vi.clearAllMocks();
});

describe('useLightboxSlides', () => {
    it('starts on the chosen photo and loops', () => {
        const { result } = renderHook(() => useLightboxSlides(2, 5, vi.fn()));

        expect(result.current.index).toBe(2);
        expect(embla.options).toHaveBeenCalledWith({ startIndex: 2, loop: true, watchDrag: true });
    });

    it('does not swipe a single photo', () => {
        renderHook(() => useLightboxSlides(0, 1, vi.fn()));

        expect(embla.options).toHaveBeenCalledWith({ startIndex: 0, loop: true, watchDrag: false });
    });

    it('follows the photo a swipe lands on', () => {
        const { result } = renderHook(() => useLightboxSlides(0, 5, vi.fn()));

        act(() => embla.api.select(3));

        expect(result.current.index).toBe(3);
    });

    it('moves with the arrow keys', () => {
        const { result } = renderHook(() => useLightboxSlides(0, 5, vi.fn()));

        result.current.onKeyDown(keyEvent('ArrowRight'));
        expect(embla.api.scrollNext).toHaveBeenCalledTimes(1);

        result.current.onKeyDown(keyEvent('ArrowLeft'));
        expect(embla.api.scrollPrev).toHaveBeenCalledTimes(1);
    });

    it('ignores other keys', () => {
        const { result } = renderHook(() => useLightboxSlides(0, 5, vi.fn()));

        result.current.onKeyDown(keyEvent('Enter'));

        expect(embla.api.scrollNext).not.toHaveBeenCalled();
        expect(embla.api.scrollPrev).not.toHaveBeenCalled();
    });

    it('closes on a tap outside the photo, not on the photo', () => {
        const close = vi.fn();
        const { result } = renderHook(() => useLightboxSlides(0, 5, close));
        const slide = document.createElement('div');
        const image = document.createElement('img');

        result.current.onSlideClick({ target: image, currentTarget: slide } as unknown as MouseEvent);
        expect(close).not.toHaveBeenCalled();

        result.current.onSlideClick({ target: slide, currentTarget: slide } as unknown as MouseEvent);
        expect(close).toHaveBeenCalledTimes(1);
    });
});
