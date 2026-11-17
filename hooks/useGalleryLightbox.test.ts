import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useGalleryLightbox } from '@/hooks/useGalleryLightbox';

describe('useGalleryLightbox', () => {
    it('starts closed', () => {
        const { result } = renderHook(() => useGalleryLightbox());

        expect(result.current.openIndex).toBeNull();
    });

    it('opens on a photo and closes', () => {
        const { result } = renderHook(() => useGalleryLightbox());

        act(() => result.current.open(0));
        expect(result.current.openIndex).toBe(0);

        act(() => result.current.close());
        expect(result.current.openIndex).toBeNull();
    });
});
