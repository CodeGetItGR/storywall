import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useGalleryCarousel } from '@/hooks/useGalleryCarousel';

describe('useGalleryCarousel', () => {
    it('starts on the first photo', () => {
        const { result } = renderHook(() => useGalleryCarousel(3));

        expect(result.current.active).toBe(0);
    });

    it('goes round at both ends', () => {
        const { result } = renderHook(() => useGalleryCarousel(3));

        act(() => result.current.previous());
        expect(result.current.active).toBe(2);

        act(() => result.current.next());
        expect(result.current.active).toBe(0);
    });

    it('jumps to a chosen photo', () => {
        const { result } = renderHook(() => useGalleryCarousel(3));

        act(() => result.current.goTo(2));
        expect(result.current.active).toBe(2);
    });
});
