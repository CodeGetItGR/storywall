import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GalleryScreen } from '@/components/gallery/GalleryScreen';

const mocks = vi.hoisted(() => ({ modalProps: vi.fn() }));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
vi.mock('@/components/reports/ReportTargetModal', () => ({
    ReportTargetModal: (props: Record<string, unknown>) => {
        mocks.modalProps(props);
        return null;
    },
}));
vi.mock('@/components/gallery/GalleryViewer', () => ({ GalleryViewer: () => null }));
vi.mock('@/components/gallery/GalleryArchiveDownloadModal', () => ({ GalleryArchiveDownloadModal: () => null }));
vi.mock('@/components/gallery/GalleryMediaGrid', () => ({ GalleryMediaGrid: () => null }));
vi.mock('@/components/gallery/GallerySelectionActions', () => ({ GallerySelectionActions: () => null }));
vi.mock('@/components/gallery/GallerySelectionBar', () => ({ GallerySelectionBar: () => null }));
vi.mock('@/components/gallery/GalleryUploadSection', () => ({ GalleryUploadSection: () => null }));
vi.mock('@/components/tools/ModuleNotice', () => ({ ModuleNotice: () => null }));
vi.mock('@/components/tools/ModulePageShell', () => ({ ModulePageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/ui/ConfirmActionModal', () => ({ ConfirmActionModal: () => null }));
vi.mock('@/hooks/useGalleryScreen', () => ({
    useGalleryScreen: () => ({
        activeEvent: { id: 'event-1', title: 'E' },
        eventId: 'event-1',
        isHost: false,
        isDeleted: false,
        galleryEnabled: true,
        canUpload: false,
        showArchiveDownload: false,
        showGalleryActions: false,
        selectedFiles: [],
        selectedSize: 0,
        media: [],
        gallerySelection: { selectionMode: false, selectedIds: new Set(), selectedCount: 0 },
        uploadMediaBatch: {},
        originalMedia: {},
        deleteMedia: {},
        selectedMedia: { id: 'media-9', eventId: 'event-1', anonymousUploaderName: null },
        canReportMedia: true,
        reportOpen: true,
        openReport: vi.fn(),
        closeReport: vi.fn(),
    }),
}));

describe('GalleryScreen report dialog', () => {
    afterEach(cleanup);

    it('reports the selected media above the viewer', () => {
        render(<GalleryScreen />);
        expect(mocks.modalProps).toHaveBeenCalledWith(
            expect.objectContaining({ targetType: 'MEDIA', targetId: 'media-9', eventId: 'event-1', layer: 'overStory', open: true }),
        );
    });
});
