import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useGalleryScreen } from '@/hooks/useGalleryScreen';
import type { MediaResponseDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({ media: [] as MediaResponseDto[] }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next-intl', () => ({ useTranslations: () => Object.assign((key: string) => key, { has: () => false }) }));
vi.mock('@/components/routing/EventRouteGate', () => ({
    useEventRouteContext: () => ({ activeEvent: null, eventId: 'event-1', isHost: false }),
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
    afterEach(cleanup);

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
});
