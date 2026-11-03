import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GalleryScreen } from '@/components/gallery/GalleryScreen';

const mocks = vi.hoisted(() => ({
    isHome: false,
    showArchiveDownload: true,
    media: [{ id: 'm1' }] as { id: string }[],
    openArchiveDownload: vi.fn(),
    liteHomeOptions: [] as { onDownload?: () => void }[],
}));

vi.mock('@/hooks/useModuleCopy', () => {
    const copy = (moduleKey: string) => ({ name: moduleKey, description: `${moduleKey} description`, cardLabel: moduleKey, Icon: () => null });
    return {
        useModuleCopy: () => copy,
        useActiveModuleCopy: copy,
        useModuleCopyResolver: () => (_eventType: unknown, moduleKey: string) => copy(moduleKey),
    };
});
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
// BackButton steps back through the router when the previous page is in the app.
vi.mock('next/navigation', () => ({ usePathname: () => '/events/event-1', useRouter: () => ({ back: vi.fn() }) }));
vi.mock('@/components/reports/ReportTargetModal', () => ({ ReportTargetModal: () => null }));
vi.mock('@/components/gallery/GalleryViewer', () => ({ GalleryViewer: () => null }));
vi.mock('@/components/gallery/GalleryArchiveDownloadModal', () => ({ GalleryArchiveDownloadModal: () => null }));
vi.mock('@/components/gallery/GalleryMediaGrid', () => ({ GalleryMediaGrid: () => null }));
vi.mock('@/components/gallery/GallerySelectionActions', () => ({ GallerySelectionActions: () => null }));
vi.mock('@/components/gallery/GallerySelectionBar', () => ({ GallerySelectionBar: () => null }));
vi.mock('@/components/gallery/GalleryUploadSection', () => ({ GalleryUploadSection: () => null }));
vi.mock('@/components/gallery/MemberArchiveModal', () => ({ MemberArchiveModal: () => null }));
vi.mock('@/components/tools/ModuleNotice', () => ({ ModuleNotice: () => null }));
vi.mock('@/components/ui/ConfirmActionModal', () => ({ ConfirmActionModal: () => null }));
vi.mock('@/components/routing/EventRouteGate', () => ({ useEventRouteContext: () => ({ eventId: 'event-1', isHost: true }) }));
vi.mock('@/components/liteHome/LiteHomeHeader', () => ({ LiteHomeHeader: () => <div data-testid="lite-home-header" /> }));
vi.mock('@/hooks/useLiteHome', () => ({
    useLiteHome: (_page: string, options: { onDownload?: () => void }) => {
        mocks.liteHomeOptions.push(options);
        return mocks.isHome ? { isHome: true, event: { id: 'event-1' }, tabs: null, actions: [], guestLink: null, upgradeHref: null } : { isHome: false };
    },
}));
vi.mock('@/hooks/useGalleryPrint', () => ({
    usePrintAvailability: () => ({ available: false, photographers: [] }),
    useGalleryPrint: () => ({ available: false, pickCount: 0, sheetOpen: false, notice: null, error: null, viewerToggle: null }),
}));
vi.mock('@/hooks/useGalleryScreen', () => ({
    useGalleryScreen: () => ({
        activeEvent: { id: 'event-1', title: 'E', modules: [] },
        eventId: 'event-1',
        isHost: true,
        isDeleted: false,
        galleryEnabled: true,
        showUpload: false,
        canUpload: false,
        showArchiveDownload: mocks.showArchiveDownload,
        showMemberArchive: false,
        showGalleryActions: true,
        openArchiveDownload: mocks.openArchiveDownload,
        selectedFiles: [],
        selectedSize: 0,
        media: mocks.media,
        gallerySelection: { selectionMode: false, selectedIds: new Set(), selectedCount: 0 },
        uploadMediaBatch: {},
        originalMedia: {},
        deleteMedia: {},
        selectedMedia: null,
    }),
}));

function lastOnDownload() {
    return mocks.liteHomeOptions.at(-1)?.onDownload;
}

describe('GalleryScreen as a lite event home', () => {
    afterEach(() => {
        cleanup();
        mocks.isHome = false;
        mocks.showArchiveDownload = true;
        mocks.media = [{ id: 'm1' }];
        mocks.liteHomeOptions = [];
    });

    it('keeps the back link, title and archive button on a full event', () => {
        render(<GalleryScreen />);

        expect(screen.getByRole('link', { name: 'backToTools' })).toBeTruthy();
        expect(screen.getByRole('heading', { level: 1, name: 'gallery' })).toBeTruthy();
        expect(screen.getByText('hostSubtitle')).toBeTruthy();
        expect(screen.getByRole('button', { name: /downloadGallery/ })).toBeTruthy();
        expect(screen.queryByTestId('lite-home-header')).toBeNull();
    });

    it('shows the home header instead of the back link and title on a lite event', () => {
        mocks.isHome = true;
        render(<GalleryScreen />);

        expect(screen.getByTestId('lite-home-header')).toBeTruthy();
        expect(screen.queryByRole('link', { name: 'backToTools' })).toBeNull();
        expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
        expect(screen.queryByText('hostSubtitle')).toBeNull();
    });

    // Download all lives in the quick actions, so the list doesn't offer it a second time.
    it('hides the archive button on a lite event', () => {
        mocks.isHome = true;
        render(<GalleryScreen />);

        expect(screen.queryByRole('button', { name: /downloadGallery/ })).toBeNull();
    });

    it('offers the archive download to the home while there is media to download', () => {
        render(<GalleryScreen />);

        expect(lastOnDownload()).toBe(mocks.openArchiveDownload);
    });

    it('offers no download with no media or no archive', () => {
        mocks.media = [];
        render(<GalleryScreen />);
        expect(lastOnDownload()).toBeUndefined();
        cleanup();

        mocks.media = [{ id: 'm1' }];
        mocks.showArchiveDownload = false;
        render(<GalleryScreen />);
        expect(lastOnDownload()).toBeUndefined();
    });
});
