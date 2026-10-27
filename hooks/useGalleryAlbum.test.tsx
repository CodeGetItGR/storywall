import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useGalleryAlbum } from '@/hooks/useGalleryAlbum';

const nav = vi.hoisted(() => ({ search: '' }));
vi.mock('next/navigation', () => ({
    usePathname: () => '/events/e1/tools/gallery',
    useSearchParams: () => new URLSearchParams(nav.search),
}));

beforeEach(() => {
    nav.search = '';
    vi.spyOn(window.history, 'replaceState');
});

describe('useGalleryAlbum', () => {
    it('reads the album from ?album=', () => {
        expect(renderHook(() => useGalleryAlbum()).result.current.album).toBe('GUEST');
        nav.search = 'album=pro';
        expect(renderHook(() => useGalleryAlbum()).result.current.album).toBe('PRO');
        nav.search = 'album=nonsense';
        expect(renderHook(() => useGalleryAlbum()).result.current.album).toBe('GUEST');
    });

    it('writes the album with a history replace and keeps other params', () => {
        nav.search = 'media=m1';
        const { result } = renderHook(() => useGalleryAlbum());
        act(() => result.current.setAlbum('PRO'));
        expect(window.history.replaceState).toHaveBeenLastCalledWith(expect.anything(), '', '/events/e1/tools/gallery?media=m1&album=pro');
        nav.search = 'media=m1&album=pro';
        const second = renderHook(() => useGalleryAlbum());
        act(() => second.result.current.setAlbum('GUEST'));
        expect(window.history.replaceState).toHaveBeenLastCalledWith(expect.anything(), '', '/events/e1/tools/gallery?media=m1');
    });
});
