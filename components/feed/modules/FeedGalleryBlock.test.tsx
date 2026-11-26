import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedGalleryBlock } from '@/components/feed/modules/FeedGalleryBlock';
import en from '@/messages/en.json';

afterEach(cleanup);

const photo = (id: string) => ({
    id,
    mediaUrl: `https://cdn.test/${id}.jpg`,
    mediaType: 'IMAGE' as const,
    status: 'READY' as const,
    thumbnailUrl: null,
});
const upload = { onFiles: vi.fn(), uploading: false, notice: null, accept: 'image/*' };
const base: ComponentProps<typeof FeedGalleryBlock> = {
    name: 'Photos',
    tiles: [photo('a'), photo('b'), photo('c')],
    more: 21,
    loading: false,
    photosHref: '/events/e1/tools/gallery',
    upload,
    archiveNote: false,
    available: true,
};

function renderBlock(props: Partial<ComponentProps<typeof FeedGalleryBlock>> = {}) {
    return render(
        <NextIntlClientProvider locale="en" messages={en}>
            <FeedGalleryBlock {...base} {...props} />
        </NextIntlClientProvider>,
    );
}

describe('FeedGalleryBlock', () => {
    it('shows the three photos as links to the gallery, the last saying how many more', () => {
        renderBlock();
        expect(screen.getAllByRole('img', { name: en.ImageAlt.guestPhoto })).toHaveLength(3);
        expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(Array(3).fill('/events/e1/tools/gallery'));
        expect(screen.getByText('+21')).toBeTruthy();
        expect(screen.getByText('21 more')).toBeTruthy();
        expect(screen.getByLabelText(en.FeedModuleBlocks.galleryUpload)).toHaveAttribute('type', 'file');
    });

    it('leaves the photos unlinked where the gallery page is closed to the visitor', () => {
        renderBlock({ photosHref: null });
        expect(screen.queryByRole('link')).toBeNull();
    });

    it('draws the empty look with a button for the first photo', () => {
        renderBlock({ tiles: [], more: 0 });
        expect(screen.getByText(en.GalleryPage.emptyTitle)).toBeTruthy();
        expect(screen.getByRole('img', { name: 'Photos' })).toBeTruthy();
        expect(screen.getByLabelText(en.FeedModuleBlocks.galleryUploadFirst)).toBeTruthy();
    });

    it('fills missing tiles with blanks and shows no +N for a small album', () => {
        renderBlock({ tiles: [photo('a')], more: 0 });
        expect(screen.getAllByRole('img')).toHaveLength(1);
        expect(screen.queryByText(/^\+/)).toBeNull();
        expect(screen.queryByText(en.GalleryPage.emptyTitle)).toBeNull();
    });

    it('shows plain tiles while loading, without the empty line', () => {
        renderBlock({ tiles: [], more: 0, loading: true });
        expect(screen.queryByRole('img')).toBeNull();
        expect(screen.queryByText(en.GalleryPage.emptyTitle)).toBeNull();
    });

    it('has no upload button on an event that takes no uploads now', () => {
        renderBlock({ upload: null });
        expect(screen.queryByLabelText(en.FeedModuleBlocks.galleryUpload)).toBeNull();
    });

    it('turns the button off once the module is gone', () => {
        renderBlock({ tiles: [], more: 0, available: false, upload: null });
        expect(screen.getByRole('button', { name: en.FeedModuleBlocks.galleryUploadFirst })).toBeDisabled();
    });

    it('says how the upload went, and that members can download it', () => {
        renderBlock({ upload: { ...upload, notice: '2 uploaded, 0 failed.' }, archiveNote: true });
        expect(screen.getByRole('status')).toHaveTextContent('2 uploaded, 0 failed.');
        expect(screen.getByText(en.GalleryPage.memberArchiveUploadNote)).toBeTruthy();
    });

    it('labels a video tile as a video', () => {
        renderBlock({ tiles: [{ ...photo('v'), mediaType: 'VIDEO', thumbnailUrl: 'https://cdn.test/v.jpg' }], more: 0 });
        expect(screen.getByRole('img', { name: en.ImageAlt.guestVideo })).toBeTruthy();
    });
});
