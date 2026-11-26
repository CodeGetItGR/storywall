import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GalleryUploadSection } from '@/components/gallery/GalleryUploadSection';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/components/incident/IncidentPausedNote', () => ({ IncidentPausedNote: () => null }));
vi.mock('@/hooks/useUploadAccept', () => ({ useUploadAccept: () => ({ media: 'image/*,video/*' }) }));

afterEach(cleanup);

describe('GalleryUploadSection', () => {
    it('anchors the hidden file input to its label, so focusing it does not shift the page', () => {
        const { container } = render(
            <GalleryUploadSection
                canUpload
                selectedFiles={[]}
                selectedSize={0}
                uploadNotice={null}
                showMemberArchiveNote={false}
                maxFiles={10}
                isUploading={false}
                frame={null}
                onFilesChange={vi.fn()}
                onClearSelection={vi.fn()}
                onUpload={vi.fn()}
            />,
        );

        expect(container.querySelector('input[type="file"]')?.closest('label')).toHaveClass('relative');
    });

    it('locks the picker and Clear while an upload is under way', () => {
        const { container } = render(
            <GalleryUploadSection
                canUpload
                selectedFiles={[new File(['x'], 'a.jpg', { type: 'image/jpeg' })]}
                selectedSize={1}
                uploadNotice={null}
                showMemberArchiveNote={false}
                maxFiles={10}
                isUploading
                frame={null}
                onFilesChange={vi.fn()}
                onClearSelection={vi.fn()}
                onUpload={vi.fn()}
            />,
        );

        expect(container.querySelector('input[type="file"]')).toBeDisabled();
        expect(screen.getByRole('button', { name: 'clear' })).toBeDisabled();
    });
});
