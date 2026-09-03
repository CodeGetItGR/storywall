import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('embla-carousel-react', () => {
    const listeners = new Map<string, () => void>();
    const api = {
        selectedScrollSnap: vi.fn().mockReturnValue(0),
        on: vi.fn((event: string, handler: () => void) => listeners.set(event, handler)),
        off: vi.fn((event: string) => listeners.delete(event)),
        scrollTo: vi.fn(),
        __emitSelect: (index: number) => {
            api.selectedScrollSnap.mockReturnValue(index);
            listeners.get('select')?.();
        },
    };
    return { default: () => [vi.fn(), api], __mockApi: api };
});

import { useStoryFilterCarousel } from '@/hooks/useStoryFilterCarousel';

describe('useStoryFilterCarousel', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('starts at index 0 with no visible name', () => {
        const { result } = renderHook(() => useStoryFilterCarousel(['original', 'warm', 'noir']));
        expect(result.current.currentIndex).toBe(0);
        expect(result.current.visibleName).toBeNull();
    });

    it('updates currentIndex and visibleName when Embla selects a new slide', async () => {
        const { __mockApi } = (await import('embla-carousel-react')) as unknown as { __mockApi: { __emitSelect: (i: number) => void } };
        const { result } = renderHook(() => useStoryFilterCarousel(['original', 'warm', 'noir']));

        act(() => __mockApi.__emitSelect(1));

        expect(result.current.currentIndex).toBe(1);
        expect(result.current.visibleName).toBe('warm');
    });

    it('clears visibleName about 1s after the last selection', async () => {
        const { __mockApi } = (await import('embla-carousel-react')) as unknown as { __mockApi: { __emitSelect: (i: number) => void } };
        const { result } = renderHook(() => useStoryFilterCarousel(['original', 'warm', 'noir']));

        act(() => __mockApi.__emitSelect(2));
        expect(result.current.visibleName).toBe('noir');

        act(() => vi.advanceTimersByTime(1000));
        expect(result.current.visibleName).toBeNull();
    });

    it('scrollTo delegates to the underlying Embla API with jump=true', async () => {
        const { __mockApi } = (await import('embla-carousel-react')) as unknown as { __mockApi: { scrollTo: ReturnType<typeof vi.fn> } };
        const { result } = renderHook(() => useStoryFilterCarousel(['original', 'warm', 'noir']));

        act(() => result.current.scrollTo(2));

        expect(__mockApi.scrollTo).toHaveBeenCalledWith(2, true);
    });
});
