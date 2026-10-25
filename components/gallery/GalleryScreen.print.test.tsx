import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GalleryScreen } from '@/components/gallery/GalleryScreen';

const mocks = vi.hoisted(() => ({
    available: true,
    pickCount: 2,
    showPill: true,
    selectionMode: false,
    canDownloadSelection: false,
    sheetOpen: false,
    openSheet: vi.fn(),
    addSelected: vi.fn(),
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
vi.mock('@/components/reports/ReportTargetModal', () => ({ ReportTargetModal: () => null }));
vi.mock('@/components/gallery/GalleryViewer', () => ({ GalleryViewer: () => null }));
vi.mock('@/components/gallery/GalleryArchiveDownloadModal', () => ({ GalleryArchiveDownloadModal: () => null }));
vi.mock('@/components/gallery/GalleryUploadSection', () => ({ GalleryUploadSection: () => null }));
vi.mock('@/components/gallery/MemberArchiveModal', () => ({ MemberArchiveModal: () => null }));
vi.mock('@/components/gallery/GallerySelectionBar', () => ({ GallerySelectionBar: () => null }));
vi.mock('@/components/gallery/GalleryMediaGrid', () => ({
    GalleryMediaGrid: ({ printedIds }: { printedIds?: Set<string> }) => <div data-testid="grid" data-printed={printedIds ? printedIds.size : 'none'} />,
}));
vi.mock('@/components/gallery/GallerySelectionActions', () => ({
    GallerySelectionActions: ({ canDownload, onPrintSelected }: { canDownload?: boolean; onPrintSelected?: () => void }) => (
        <div>
            {onPrintSelected && <button onClick={onPrintSelected}>print-action</button>}
            {canDownload && <button>download-action</button>}
        </div>
    ),
}));
vi.mock('@/components/gallery/print/PrintSheet', () => ({
    PrintSheet: ({ open }: { open: boolean }) => <div data-testid="print-sheet" data-open={String(open)} />,
}));
vi.mock('@/components/tools/ModuleNotice', () => ({ ModuleNotice: () => null }));
vi.mock('@/components/tools/ModulePageShell', () => ({ ModulePageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/ui/ConfirmActionModal', () => ({ ConfirmActionModal: () => null }));
vi.mock('@/components/routing/EventRouteGate', () => ({ useEventRouteContext: () => ({ eventId: 'event-1', isHost: true }) }));
vi.mock('@/hooks/useGalleryPrint', () => ({
    usePrintAvailability: () => ({ available: mocks.available, photographers: [] }),
    useGalleryPrint: () => ({
        available: mocks.available,
        pickCount: mocks.pickCount,
        showPill: mocks.showPill,
        pickedIds: new Set(['m1', 'm2']),
        sheetOpen: mocks.sheetOpen,
        openSheet: mocks.openSheet,
        closeSheet: vi.fn(),
        addSelected: mocks.addSelected,
        isAdding: false,
        notice: null,
        error: null,
        viewerToggle: null,
        photographers: [],
        photographer: null,
        items: [],
        totals: { prints: 0, included: null, beyond: 0, priceCents: null, hasPrices: false },
        selectPhotographer: vi.fn(),
        updateItem: vi.fn(),
        deleteItem: vi.fn(),
    }),
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
        showArchiveDownload: false,
        showMemberArchive: false,
        showGalleryActions: true,
        canSelect: true,
        canDownloadSelection: mocks.canDownloadSelection,
        selectedFiles: [],
        selectedSize: 0,
        media: [{ id: 'm1' }],
        gallerySelection: { selectionMode: mocks.selectionMode, selectedIds: new Set(), selectedCount: 0 },
        uploadMediaBatch: {},
        originalMedia: {},
        deleteMedia: {},
        selectedMedia: null,
        enterSelectionMode: vi.fn(),
        exitSelectionMode: vi.fn(),
    }),
}));

describe('GalleryScreen print picks', () => {
    afterEach(() => {
        cleanup();
        mocks.available = true;
        mocks.pickCount = 2;
        mocks.showPill = true;
        mocks.selectionMode = false;
        mocks.canDownloadSelection = false;
        mocks.sheetOpen = false;
        mocks.openSheet.mockReset();
    });

    it('shows the pill with picks and opens the sheet from it', () => {
        render(<GalleryScreen />);
        fireEvent.click(screen.getByRole('button', { name: 'pill' }));
        expect(mocks.openSheet).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('print-sheet')).toHaveAttribute('data-open', 'false');
        expect(screen.getByTestId('grid')).toHaveAttribute('data-printed', '2');
    });

    it('keeps the pill with a count of 0 while another list has picks', () => {
        mocks.pickCount = 0;
        render(<GalleryScreen />);
        expect(screen.getByRole('button', { name: 'pill' })).toBeInTheDocument();
    });

    it('has no pill without picks', () => {
        mocks.pickCount = 0;
        mocks.showPill = false;
        render(<GalleryScreen />);
        expect(screen.queryByRole('button', { name: 'pill' })).not.toBeInTheDocument();
    });

    it('offers Print and hides Download in selection mode when the selection cannot be downloaded', () => {
        mocks.selectionMode = true;
        render(<GalleryScreen />);
        expect(screen.getByRole('button', { name: 'print-action' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'download-action' })).not.toBeInTheDocument();
    });

    it('renders no sheet, no badges and no Print action when print is unavailable', () => {
        mocks.available = false;
        mocks.selectionMode = true;
        render(<GalleryScreen />);
        expect(screen.queryByTestId('print-sheet')).not.toBeInTheDocument();
        expect(screen.getByTestId('grid')).toHaveAttribute('data-printed', 'none');
        expect(screen.queryByRole('button', { name: 'print-action' })).not.toBeInTheDocument();
    });
});
