import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useGalleryScreen } from '@/hooks/useGalleryScreen';
import type { MediaResponseDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({
    media: [] as MediaResponseDto[],
    proMedia: [] as MediaResponseDto[],
    album: 'GUEST' as 'GUEST' | 'PRO',
    setAlbum: vi.fn(),
    exitSelectionMode: vi.fn(),
    isHost: false,
    activeEvent: null as { status: string; deletedAt: string | null; modules?: unknown[] } | null,
    activeMember: null as { id: string } | null,
    reportTargetTypes: ['MEDIA'] as string[],
    writable: true,
    hasNextPage: false,
    deleteMedia: vi.fn<(id: string) => Promise<void>>(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next-intl', () => ({ useTranslations: () => Object.assign((key: string) => key, { has: () => false }) }));
vi.mock('@/components/routing/EventRouteGate', () => ({
    useEventRouteContext: () => ({ activeEvent: mocks.activeEvent, eventId: 'event-1', isHost: mocks.isHost }),
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: { media: {}, reportTargetTypes: mocks.reportTargetTypes } }) }));
vi.mock('@/hooks/useGallerySelection', () => ({
    useGallerySelection: () => ({
        consumeLongPressClick: () => false,
        selectionMode: false,
        selectedItems: [],
        selectedCount: 0,
        exitSelectionMode: mocks.exitSelectionMode,
    }),
}));
vi.mock('@/hooks/useInfiniteScrollSentinel', () => ({ useInfiniteScrollSentinel: () => vi.fn() }));
vi.mock('@/hooks/useMedia', () => ({
    useEventMedia: (_eventId: string, collection = 'GUEST') => ({
        data: {
            pages: [
                {
                    content: collection === 'PRO' ? mocks.proMedia : mocks.media,
                    page: { number: 0, totalPages: 1, totalElements: collection === 'PRO' ? mocks.proMedia.length : mocks.media.length, size: 30 },
                },
            ],
        },
        isLoading: false,
        fetchNextPage: vi.fn(),
        hasNextPage: mocks.hasNextPage,
        isFetchingNextPage: false,
    }),
    useOriginalMedia: () => ({}),
    useDeleteMedia: () => ({ mutateAsync: mocks.deleteMedia, isPending: false }),
    useUploadMediaBatch: () => ({}),
}));
vi.mock('@/hooks/useGalleryAlbum', () => ({ useGalleryAlbum: () => ({ album: mocks.album, setAlbum: mocks.setAlbum }) }));
vi.mock('@/lib/eventLifecycle', () => ({
    isEventDeleted: (event: { deletedAt: string | null } | null) => Boolean(event?.deletedAt),
    isEventWritable: () => mocks.writable,
    readableModuleKeys: () => new Set(['gallery']),
}));
vi.mock('@/hooks/useContentAccess', () => ({ useContentAccess: () => ({ isDemoBuilder: false, isLocked: () => false }) }));
vi.mock('@/providers/EventProvider', () => ({ useActiveMember: () => mocks.activeMember }));
vi.mock('@/providers/MobileChromeProvider', () => ({
    useMobileChromeActions: () => ({ hideMobileTabBar: vi.fn(), showMobileTabBar: vi.fn() }),
}));
vi.mock('@/lib/api/client', () => ({ api: {} }));

function photo(mediaUrl: string): MediaResponseDto {
    return { id: 'media-1', mediaType: 'IMAGE', status: 'READY', mediaUrl } as MediaResponseDto;
}

describe('useGalleryScreen', () => {
    afterEach(() => {
        cleanup();
        mocks.isHost = false;
        mocks.activeEvent = null;
        mocks.activeMember = null;
        mocks.reportTargetTypes = ['MEDIA'];
        mocks.writable = true;
        mocks.hasNextPage = false;
        mocks.proMedia = [];
        mocks.album = 'GUEST';
        mocks.setAlbum.mockReset();
        mocks.exitSelectionMode.mockReset();
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

        it('is true when the event is read-only', () => {
            mocks.activeMember = { id: 'me' };
            mocks.writable = false;
            expect(openItem('someone-else').result.current.canReportMedia).toBe(true);
        });

        it('is true on a soft-deleted event, where nothing can be deleted', () => {
            mocks.activeMember = { id: 'me' };
            mocks.isHost = true;
            mocks.activeEvent = { status: 'ACTIVE', deletedAt: '2026-09-30T12:00:00Z' };
            mocks.writable = false;
            const { result } = openItem('someone-else');
            expect(result.current.canReportMedia).toBe(true);
            expect(result.current.canDeleteMedia).toBe(false);
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

            mocks.reportTargetTypes = [];
            rerender();
            expect(result.current.reportOpen).toBe(false);

            mocks.reportTargetTypes = ['MEDIA'];
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

    describe('member archive entry', () => {
        const withArchive = {
            status: 'ACTIVE',
            deletedAt: null,
            modules: [{ moduleKey: 'gallery', isAvailable: true, configuration: { qrUploadEnabled: true, memberArchiveAfterEnd: true } }],
        };

        it('is offered to a guest when the gallery has the setting', () => {
            mocks.activeEvent = withArchive;
            const { result } = renderHook(() => useGalleryScreen());

            expect(result.current.showMemberArchive).toBe(true);
            expect(result.current.showArchiveDownload).toBe(false);
            expect(result.current.showGalleryActions).toBe(false);
        });

        it('is not offered to a host, who keeps the live download', () => {
            mocks.isHost = true;
            mocks.activeEvent = withArchive;
            const { result } = renderHook(() => useGalleryScreen());

            expect(result.current.showMemberArchive).toBe(false);
            expect(result.current.showArchiveDownload).toBe(true);
        });

        it('is not offered without the setting', () => {
            mocks.activeEvent = {
                ...withArchive,
                modules: [{ moduleKey: 'gallery', isAvailable: true, configuration: { qrUploadEnabled: true } }],
            };
            const { result } = renderHook(() => useGalleryScreen());

            expect(result.current.showMemberArchive).toBe(false);
        });

        // Guests upload through posts and the QR link; the gallery page is view and download only for them.
        it('gives a guest no upload box, and a host one', () => {
            mocks.activeEvent = withArchive;
            mocks.activeMember = { id: 'me' };
            expect(renderHook(() => useGalleryScreen()).result.current).toMatchObject({ showUpload: false, canUpload: false });

            mocks.isHost = true;
            expect(renderHook(() => useGalleryScreen()).result.current).toMatchObject({ showUpload: true, canUpload: true });
        });

        it('opens and closes the member modal', () => {
            mocks.activeEvent = withArchive;
            const { result } = renderHook(() => useGalleryScreen());

            act(() => result.current.openMemberArchive());
            expect(result.current.memberArchiveOpen).toBe(true);
            act(() => result.current.closeMemberArchive());
            expect(result.current.memberArchiveOpen).toBe(false);
        });
    });
});

describe('useGalleryScreen Pro album', () => {
    afterEach(() => {
        cleanup();
        mocks.isHost = false;
        mocks.activeEvent = null;
        mocks.activeMember = null;
        mocks.media = [];
        mocks.proMedia = [];
        mocks.album = 'GUEST';
        mocks.setAlbum.mockReset();
        mocks.exitSelectionMode.mockReset();
    });

    it('offers the original download for a guest photo but not for a Pro photo', () => {
        mocks.isHost = true;
        mocks.activeEvent = { status: 'ACTIVE', deletedAt: null };
        mocks.activeMember = { id: 'host' };
        mocks.media = [{ ...photo('https://cdn/a.jpg'), id: 'guest-1' }];
        mocks.proMedia = [{ ...photo('https://cdn/pro.jpg'), id: 'pro-1', collection: 'PRO' }];
        const { result } = renderHook(() => useGalleryScreen());
        act(() => result.current.handleMediaClick('guest-1'));
        expect(result.current.canDownloadOriginal).toBe(true);

        mocks.album = 'PRO';
        const pro = renderHook(() => useGalleryScreen());
        act(() => pro.result.current.handleMediaClick('pro-1'));
        expect(pro.result.current.canDownloadOriginal).toBe(false);
        expect(pro.result.current.canDeleteMedia).toBe(true);
    });

    it('has no tabs while the event has no Pro items', () => {
        const { result } = renderHook(() => useGalleryScreen());
        expect(result.current.showAlbumTabs).toBe(false);
        expect(result.current.album).toBe('GUEST');
    });

    it('shows the tabs and the Pro items on the Pro tab, without upload or selection', () => {
        mocks.isHost = true;
        mocks.activeEvent = { status: 'ACTIVE', deletedAt: null };
        mocks.activeMember = { id: 'host' };
        mocks.proMedia = [{ ...photo('https://cdn/pro.jpg'), id: 'pro-1' }];
        mocks.album = 'PRO';
        const { result } = renderHook(() => useGalleryScreen());
        expect(result.current.showAlbumTabs).toBe(true);
        expect(result.current.album).toBe('PRO');
        expect(result.current.media.map((item) => item.id)).toEqual(['pro-1']);
        expect(result.current.showUpload).toBe(false);
        expect(result.current.showArchiveDownload).toBe(false);
        expect(result.current.showGalleryActions).toBe(false);
    });

    it('falls back to the guest album when ?album=pro has nothing to show', () => {
        mocks.album = 'PRO';
        const { result } = renderHook(() => useGalleryScreen());
        expect(result.current.album).toBe('GUEST');
    });

    it('leaves selection and the open item when the tab changes', () => {
        mocks.media = [photo('https://cdn/a.jpg')];
        mocks.proMedia = [{ ...photo('https://cdn/pro.jpg'), id: 'pro-1' }];
        const { result } = renderHook(() => useGalleryScreen());
        act(() => result.current.handleMediaClick('media-1'));
        act(() => result.current.selectAlbum('PRO'));
        expect(mocks.exitSelectionMode).toHaveBeenCalled();
        expect(mocks.setAlbum).toHaveBeenCalledWith('PRO');
        expect(result.current.selectedMedia).toBeNull();
    });
});
