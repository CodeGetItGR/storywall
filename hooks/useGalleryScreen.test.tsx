import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useGalleryScreen } from '@/hooks/useGalleryScreen';
import type { MediaResponseDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({
    media: [] as MediaResponseDto[],
    isHost: false,
    activeMember: null as { id: string } | null,
    reportTargetTypes: ['MEDIA'] as string[],
    writable: true,
    hasNextPage: false,
    deleteMedia: vi.fn<(id: string) => Promise<void>>(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next-intl', () => ({ useTranslations: () => Object.assign((key: string) => key, { has: () => false }) }));
vi.mock('@/components/routing/EventRouteGate', () => ({
    useEventRouteContext: () => ({ activeEvent: null, eventId: 'event-1', isHost: mocks.isHost }),
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: { media: {}, reportTargetTypes: mocks.reportTargetTypes } }) }));
vi.mock('@/hooks/useGallerySelection', () => ({
    useGallerySelection: () => ({ consumeLongPressClick: () => false, selectionMode: false, selectedItems: [], selectedCount: 0 }),
}));
vi.mock('@/hooks/useInfiniteScrollSentinel', () => ({ useInfiniteScrollSentinel: () => vi.fn() }));
vi.mock('@/hooks/useMedia', () => ({
    useEventMedia: () => ({
        data: { pages: [{ content: mocks.media }] },
        isLoading: false,
        fetchNextPage: vi.fn(),
        hasNextPage: mocks.hasNextPage,
        isFetchingNextPage: false,
    }),
    useOriginalMedia: () => ({}),
    useDeleteMedia: () => ({ mutateAsync: mocks.deleteMedia, isPending: false }),
    useUploadMediaBatch: () => ({}),
}));
vi.mock('@/lib/eventLifecycle', () => ({
    isEventDeleted: () => false,
    isEventWritable: () => mocks.writable,
    readableModuleKeys: () => new Set(['gallery']),
}));
vi.mock('@/providers/EventProvider', () => ({ useActiveMember: () => mocks.activeMember }));
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
        mocks.activeMember = null;
        mocks.reportTargetTypes = ['MEDIA'];
        mocks.writable = true;
        mocks.hasNextPage = false;
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

    it('does not offer delete to a non-member', () => {
        mocks.media = [photo('https://r2.example/a.jpg')];
        const { result } = renderHook(() => useGalleryScreen());
        act(() => result.current.handleMediaClick('media-1'));

        expect(result.current.canDeleteMedia).toBe(false);
    });

    describe('canDeleteMedia for a guest', () => {
        function openItem(uploaderMemberId: string | null) {
            mocks.media = [{ ...photo('https://r2.example/a.jpg'), uploaderMemberId }];
            const hook = renderHook(() => useGalleryScreen());
            act(() => hook.result.current.handleMediaClick('media-1'));
            return hook;
        }

        it('is true for their own upload', () => {
            mocks.activeMember = { id: 'me' };
            expect(openItem('me').result.current.canDeleteMedia).toBe(true);
        });

        it("is false for another member's upload", () => {
            mocks.activeMember = { id: 'me' };
            expect(openItem('someone-else').result.current.canDeleteMedia).toBe(false);
        });

        it('is false for an anonymous QR upload', () => {
            mocks.activeMember = { id: 'me' };
            expect(openItem(null).result.current.canDeleteMedia).toBe(false);
        });

        it('is false for their own upload when the event is not writable', () => {
            mocks.activeMember = { id: 'me' };
            mocks.writable = false;
            expect(openItem('me').result.current.canDeleteMedia).toBe(false);
        });
    });

    describe('canReportMedia', () => {
        function openItem(uploaderMemberId: string | null) {
            mocks.media = [{ ...photo('https://r2.example/a.jpg'), uploaderMemberId }];
            const hook = renderHook(() => useGalleryScreen());
            act(() => hook.result.current.handleMediaClick('media-1'));
            return hook;
        }

        it("is true for another member's item", () => {
            mocks.activeMember = { id: 'me' };
            expect(openItem('someone-else').result.current.canReportMedia).toBe(true);
        });

        it('is true for an anonymous QR upload', () => {
            mocks.activeMember = { id: 'me' };
            expect(openItem(null).result.current.canReportMedia).toBe(true);
        });

        it("is false for the member's own item", () => {
            mocks.activeMember = { id: 'me' };
            expect(openItem('me').result.current.canReportMedia).toBe(false);
        });

        it('is false for a non-member', () => {
            expect(openItem('someone-else').result.current.canReportMedia).toBe(false);
        });

        it('is false when the event is not writable', () => {
            mocks.activeMember = { id: 'me' };
            mocks.writable = false;
            expect(openItem('someone-else').result.current.canReportMedia).toBe(false);
        });

        it('is false when config does not list MEDIA', () => {
            mocks.activeMember = { id: 'me' };
            mocks.reportTargetTypes = ['POST'];
            expect(openItem('someone-else').result.current.canReportMedia).toBe(false);
        });

        it('keeps the dialog on its item when a page lands after Next', () => {
            mocks.activeMember = { id: 'me' };
            mocks.hasNextPage = true;
            mocks.media = [{ ...photo('https://r2.example/a.jpg'), uploaderMemberId: 'x' }];
            const { result, rerender } = renderHook(() => useGalleryScreen());
            act(() => result.current.handleMediaClick('media-1'));
            act(() => result.current.showNextMedia());
            act(() => result.current.openReport());

            mocks.media = [mocks.media[0], { ...photo('https://r2.example/b.jpg'), id: 'media-2', uploaderMemberId: 'x' }];
            rerender();

            expect(result.current.selectedMedia?.id).toBe('media-1');
            expect(result.current.reportOpen).toBe(true);
        });

        it('does not show the dialog for another item after the reported one leaves the list', () => {
            mocks.activeMember = { id: 'me' };
            mocks.media = [{ ...photo('https://r2.example/a.jpg'), uploaderMemberId: 'x' }];
            const { result, rerender } = renderHook(() => useGalleryScreen());
            act(() => result.current.handleMediaClick('media-1'));
            act(() => result.current.openReport());
            expect(result.current.reportOpen).toBe(true);

            mocks.media = [{ ...photo('https://r2.example/b.jpg'), id: 'media-2', uploaderMemberId: 'x' }];
            rerender();
            act(() => result.current.handleMediaClick('media-2'));

            expect(result.current.reportOpen).toBe(false);
        });

        it('hides the dialog when reporting stops being allowed and does not bring it back', () => {
            mocks.activeMember = { id: 'me' };
            const { result, rerender } = openItem('someone-else');
            act(() => result.current.openReport());
            expect(result.current.reportOpen).toBe(true);

            mocks.writable = false;
            rerender();
            expect(result.current.reportOpen).toBe(false);

            mocks.writable = true;
            rerender();
            expect(result.current.reportOpen).toBe(false);
        });

        it('opens and closes the report dialog', () => {
            mocks.activeMember = { id: 'me' };
            const { result } = openItem('someone-else');
            expect(result.current.reportOpen).toBe(false);
            act(() => result.current.openReport());
            expect(result.current.reportOpen).toBe(true);
            act(() => result.current.closeReport());
            expect(result.current.reportOpen).toBe(false);
        });
    });
});
