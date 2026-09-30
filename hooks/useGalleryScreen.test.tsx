import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useGalleryScreen } from '@/hooks/useGalleryScreen';
import type { MediaResponseDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({
    media: [] as MediaResponseDto[],
    isHost: false,
    deleteMedia: vi.fn<(id: string) => Promise<void>>(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next-intl', () => ({ useTranslations: () => Object.assign((key: string) => key, { has: () => false }) }));
vi.mock('@/components/routing/EventRouteGate', () => ({
    useEventRouteContext: () => ({ activeEvent: null, eventId: 'event-1', isHost: mocks.isHost }),
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: undefined }) }));
vi.mock('@/hooks/useGallerySelection', () => ({
    useGallerySelection: () => ({ consumeLongPressClick: () => false, selectionMode: false, selectedItems: [], selectedCount: 0 }),
}));
vi.mock('@/hooks/useInfiniteScrollSentinel', () => ({ useInfiniteScrollSentinel: () => vi.fn() }));
vi.mock('@/hooks/useMedia', () => ({
    useEventMedia: () => ({
        data: { pages: [{ content: mocks.media }] },
        isLoading: false,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
    }),
    useOriginalMedia: () => ({}),
    useDeleteMedia: () => ({ mutateAsync: mocks.deleteMedia, isPending: false }),
    useUploadMediaBatch: () => ({}),
}));
vi.mock('@/lib/eventLifecycle', () => ({
    isEventDeleted: () => false,
    isEventWritable: () => true,
    readableModuleKeys: () => new Set(['gallery']),
}));
vi.mock('@/providers/EventProvider', () => ({ useActiveMember: () => null }));
vi.mock('@/providers/MobileChromeProvider', () => ({
    useMobileChrome: () => ({ hideMobileTabBar: vi.fn(), showMobileTabBar: vi.fn() }),
}));
vi.mock('@/lib/api/client', () => ({ api: {} }));

function photo(mediaUrl: string): MediaResponseDto {
    return { id: 'media-1', mediaType: 'IMAGE', status: 'READY', mediaUrl } as MediaResponseDto;
}

describe('useGalleryScreen', () => {
    afterEach(() => {
        cleanup();
        mocks.isHost = false;
        mocks.deleteMedia.mockReset();
    });

    // The viewer used to hold a copy of the item it opened with, so the list's
    // refetches never reached it and its presigned URL went stale while open.
    it('shows the open item with the URL from the latest refetch', () => {
        mocks.media = [photo('https://r2.example/a.jpg?sig=window-1')];
        const { result, rerender } = renderHook(() => useGalleryScreen());
        act(() => result.current.handleMediaClick('media-1'));

        mocks.media = [photo('https://r2.example/a.jpg?sig=window-2')];
        rerender();

        expect(result.current.selectedMedia?.mediaUrl).toBe('https://r2.example/a.jpg?sig=window-2');
    });

    it('lets a host delete the open item and closes the viewer afterwards', async () => {
        mocks.isHost = true;
        mocks.media = [photo('https://r2.example/a.jpg')];
        mocks.deleteMedia.mockResolvedValue(undefined);
        const { result } = renderHook(() => useGalleryScreen());
        act(() => result.current.handleMediaClick('media-1'));

        expect(result.current.canDeleteMedia).toBe(true);
        act(() => result.current.requestDeleteMedia());
        expect(result.current.confirmDeleteOpen).toBe(true);

        await act(() => result.current.confirmDeleteMedia());

        expect(mocks.deleteMedia).toHaveBeenCalledWith('media-1');
        expect(result.current.confirmDeleteOpen).toBe(false);
        expect(result.current.selectedMedia).toBeNull();
    });

    it('keeps the confirmation open with an error when the delete fails', async () => {
        mocks.isHost = true;
        mocks.media = [photo('https://r2.example/a.jpg')];
        mocks.deleteMedia.mockRejectedValue(new Error('boom'));
        const { result } = renderHook(() => useGalleryScreen());
        act(() => result.current.handleMediaClick('media-1'));
        act(() => result.current.requestDeleteMedia());

        await act(() => result.current.confirmDeleteMedia());

        expect(result.current.confirmDeleteOpen).toBe(true);
        expect(result.current.deleteError).toBe('error');
        expect(result.current.selectedMedia?.id).toBe('media-1');
    });

    it('does not offer delete to a guest', () => {
        mocks.media = [photo('https://r2.example/a.jpg')];
        const { result } = renderHook(() => useGalleryScreen());
        act(() => result.current.handleMediaClick('media-1'));

        expect(result.current.canDeleteMedia).toBe(false);
    });
});
