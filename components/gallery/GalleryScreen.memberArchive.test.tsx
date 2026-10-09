import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GalleryScreen } from '@/components/gallery/GalleryScreen';

const mocks = vi.hoisted(() => ({
    isHost: false,
    showMemberArchive: true,
    memberArchiveOpen: false,
    openMemberArchive: vi.fn(),
    modalMounts: 0,
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
vi.mock('@/components/gallery/GalleryMediaGrid', () => ({ GalleryMediaGrid: () => null }));
vi.mock('@/components/gallery/GallerySelectionActions', () => ({ GallerySelectionActions: () => null }));
vi.mock('@/components/gallery/GallerySelectionBar', () => ({ GallerySelectionBar: () => null }));
vi.mock('@/components/gallery/GalleryUploadSection', () => ({ GalleryUploadSection: () => null }));
vi.mock('@/components/gallery/MemberArchiveModal', () => ({
    MemberArchiveModal: function MemberArchiveModal() {
        useEffect(() => {
            mocks.modalMounts += 1;
        }, []);
        return null;
    },
}));
vi.mock('@/components/tools/ModuleNotice', () => ({ ModuleNotice: () => null }));
vi.mock('@/components/tools/ModulePageShell', () => ({ ModulePageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/ui/ConfirmActionModal', () => ({ ConfirmActionModal: () => null }));
vi.mock('@/hooks/useGalleryScreen', () => ({
    useGalleryScreen: () => ({
        activeEvent: { id: 'event-1', title: 'E', modules: [] },
        eventId: 'event-1',
        isHost: mocks.isHost,
        isDeleted: false,
        galleryEnabled: true,
        canUpload: false,
        showArchiveDownload: mocks.isHost,
        showMemberArchive: mocks.showMemberArchive,
        showGalleryActions: false,
        memberArchiveOpen: mocks.memberArchiveOpen,
        openMemberArchive: mocks.openMemberArchive,
        closeMemberArchive: vi.fn(),
        selectedFiles: [],
        selectedSize: 0,
        media: [],
        gallerySelection: { selectionMode: false, selectedIds: new Set(), selectedCount: 0 },
        uploadMediaBatch: {},
        originalMedia: {},
        deleteMedia: {},
        selectedMedia: null,
    }),
}));

describe('GalleryScreen member archive', () => {
    afterEach(() => {
        cleanup();
        mocks.isHost = false;
        mocks.showMemberArchive = true;
        mocks.memberArchiveOpen = false;
        mocks.openMemberArchive.mockReset();
        mocks.modalMounts = 0;
    });

    it('gives a guest with the setting a download button that opens the member modal', () => {
        render(<GalleryScreen />);

        fireEvent.click(screen.getByRole('button', { name: /downloadGallery/ }));
        expect(mocks.openMemberArchive).toHaveBeenCalledTimes(1);
    });

    it('gives a host no member download button', () => {
        mocks.isHost = true;
        mocks.showMemberArchive = false;
        render(<GalleryScreen />);

        expect(screen.queryByRole('button', { name: /downloadGallery/ })).toBeNull();
    });

    // A fresh modal per opening, so an error from the last visit is not shown again.
    it('mounts a fresh member modal each time it opens', () => {
        const { rerender } = render(<GalleryScreen />);
        mocks.memberArchiveOpen = true;
        rerender(<GalleryScreen />);

        expect(mocks.modalMounts).toBe(2);
    });
});
