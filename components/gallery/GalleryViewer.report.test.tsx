import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GalleryViewer } from '@/components/gallery/GalleryViewer';
import type { MediaResponseDto } from '@/lib/api/types';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useOverlayHistory', () => ({ useOverlayHistory: () => ({ requestClose: vi.fn() }) }));
vi.mock('@/components/common/ProtectedImage', () => ({ ProtectedImage: () => null }));

const video = {
    id: 'media-1',
    mediaType: 'VIDEO',
    status: 'READY',
    mediaUrl: 'https://r2.example/v.mp4',
    originalFilename: 'v.mp4',
} as MediaResponseDto;

function renderViewer(props: Partial<React.ComponentProps<typeof GalleryViewer>> = {}) {
    const handlers = { onReport: vi.fn(), onPrevious: vi.fn(), onNext: vi.fn() };
    render(
        <GalleryViewer
            media={video}
            canDownloadOriginal={false}
            canDelete={false}
            canReport
            reportOpen={false}
            originalError={null}
            isDownloadingOriginal={false}
            hasPrevious
            hasNext
            onClose={vi.fn()}
            onDownloadOriginal={vi.fn()}
            onDelete={vi.fn()}
            {...handlers}
            {...props}
        />,
    );
    return handlers;
}

describe('GalleryViewer report action', () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('shows a Report button that calls onReport', () => {
        const { onReport } = renderViewer();
        fireEvent.click(screen.getByRole('button', { name: 'reportMedia' }));
        expect(onReport).toHaveBeenCalledTimes(1);
    });

    it('hides the Report button when the item is not reportable', () => {
        renderViewer({ canReport: false });
        expect(screen.queryByRole('button', { name: 'reportMedia' })).toBeNull();
    });

    it('navigates with arrow keys normally', () => {
        const { onNext } = renderViewer();
        fireEvent.keyDown(window, { key: 'ArrowRight' });
        expect(onNext).toHaveBeenCalledTimes(1);
    });

    it('ignores arrow keys while the report dialog is open', () => {
        const { onNext, onPrevious } = renderViewer({ reportOpen: true });
        fireEvent.keyDown(window, { key: 'ArrowRight' });
        fireEvent.keyDown(window, { key: 'ArrowLeft' });
        expect(onNext).not.toHaveBeenCalled();
        expect(onPrevious).not.toHaveBeenCalled();
    });

    it('pauses a playing video while the report dialog is open', () => {
        const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
        vi.spyOn(HTMLMediaElement.prototype, 'paused', 'get').mockReturnValue(false);
        const props = {
            media: video,
            canDownloadOriginal: false,
            canDelete: false,
            canReport: true,
            originalError: null,
            isDownloadingOriginal: false,
            hasPrevious: false,
            hasNext: false,
            onClose: vi.fn(),
            onDownloadOriginal: vi.fn(),
            onDelete: vi.fn(),
            onReport: vi.fn(),
            onPrevious: vi.fn(),
            onNext: vi.fn(),
        };
        const view = render(<GalleryViewer {...props} reportOpen={false} />);
        expect(pause).not.toHaveBeenCalled();
        view.rerender(<GalleryViewer {...props} reportOpen />);
        expect(pause).toHaveBeenCalledTimes(1);
    });
});

describe('GalleryViewer video while reporting', () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    const props = {
        media: video,
        canDownloadOriginal: false,
        canDelete: false,
        canReport: true,
        originalError: null,
        isDownloadingOriginal: false,
        hasPrevious: false,
        hasNext: false,
        onClose: vi.fn(),
        onDownloadOriginal: vi.fn(),
        onDelete: vi.fn(),
        onReport: vi.fn(),
        onPrevious: vi.fn(),
        onNext: vi.fn(),
    };

    function spyPlayback(paused: boolean) {
        vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
        vi.spyOn(HTMLMediaElement.prototype, 'paused', 'get').mockReturnValue(paused);
        return vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    }

    it('resumes the video it paused when the dialog closes', () => {
        const play = spyPlayback(false);
        const view = render(<GalleryViewer {...props} reportOpen />);
        view.rerender(<GalleryViewer {...props} reportOpen={false} />);
        expect(play).toHaveBeenCalledTimes(1);
    });

    it('does not resume a video the user had already paused', () => {
        const play = spyPlayback(true);
        const view = render(<GalleryViewer {...props} reportOpen />);
        view.rerender(<GalleryViewer {...props} reportOpen={false} />);
        expect(play).not.toHaveBeenCalled();
    });

    it('does not start a detached video when unmounted with the dialog open', () => {
        const play = spyPlayback(false);
        const view = render(<GalleryViewer {...props} reportOpen />);
        view.unmount();
        expect(play).not.toHaveBeenCalled();
    });
});
