import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GalleryPhotos } from '@/components/saveMyDate/invitation/sections/media/GalleryPhotos';
import type { GalleryImage } from '@/lib/invitation/gallery';
import { INVITATION_LABELS } from '@/lib/invitation/labels';

const embla = vi.hoisted(() => ({
    scrollPrev: vi.fn(),
    scrollNext: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    selectedScrollSnap: () => 0,
}));

// Embla measures real layout, which the test DOM doesn't have. Real swiping is
// checked in the browser.
vi.mock('embla-carousel-react', () => ({ default: () => [vi.fn(), embla] }));

const labels = INVITATION_LABELS.en;

const IMAGES: GalleryImage[] = [
    { src: '/one.png', alt: 'Photo 1 of 3' },
    { src: '/two.png', alt: 'Photo 2 of 3' },
    { src: '/three.png', alt: 'Photo 3 of 3' },
];

const openFirstPhoto = () => fireEvent.click(screen.getByRole('button', { name: 'Photo 1 of 3' }));

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(cleanup);

describe('GalleryPhotos', () => {
    it.each(['grid', 'masonry', 'featured'] as const)('shows every photo in the %s layout', (layout) => {
        const { container } = render(<GalleryPhotos images={IMAGES} layout={layout} shape="square" labels={labels} />);

        expect(container.querySelectorAll('.wedart-gallery-cell.shape-square')).toHaveLength(3);
        expect(container.querySelector(`.wedart-gallery-${layout}`)).toBeTruthy();
    });

    it.each(['round', 'square', 'rectangle', 'roundedSquare'] as const)('gives cells the %s shape', (shape) => {
        const { container } = render(<GalleryPhotos images={IMAGES} layout="grid" shape={shape} labels={labels} />);

        expect(container.querySelectorAll(`.shape-${shape}`)).toHaveLength(3);
    });
});

describe('carousel', () => {
    const renderCarousel = () => render(<GalleryPhotos images={IMAGES} layout="carousel" shape="square" labels={labels} />);

    it('shows one photo and a dot per photo', () => {
        renderCarousel();

        expect(screen.getAllByRole('img')).toHaveLength(1);
        expect(screen.getByRole('img', { name: 'Photo 1 of 3' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Photo 3' })).toBeTruthy();
    });

    it('moves with the side buttons and goes round', () => {
        renderCarousel();

        fireEvent.click(screen.getByRole('button', { name: 'Previous photo' }));
        expect(screen.getByRole('img', { name: 'Photo 3 of 3' })).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
        expect(screen.getByRole('img', { name: 'Photo 1 of 3' })).toBeTruthy();
    });

    it('jumps with a dot and marks it', () => {
        renderCarousel();

        fireEvent.click(screen.getByRole('button', { name: 'Photo 2' }));

        expect(screen.getByRole('img', { name: 'Photo 2 of 3' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Photo 2' }).className).toContain('active');
        expect(screen.getByRole('button', { name: 'Photo 1' }).className).not.toContain('active');
    });

    it('opens the photo it is showing', async () => {
        renderCarousel();
        fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));

        fireEvent.click(screen.getByRole('button', { name: 'Photo 2 of 3' }));

        expect(await screen.findByRole('dialog', { name: 'Photo 2 of 3' })).toBeTruthy();
    });
});

describe('lightbox', () => {
    const renderGrid = (images = IMAGES) => render(<GalleryPhotos images={images} layout="grid" shape="square" labels={labels} />);

    it('stays closed until a photo is tapped', () => {
        renderGrid();

        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('opens with every photo, named by the current one', async () => {
        renderGrid();
        openFirstPhoto();

        const dialog = await screen.findByRole('dialog', { name: 'Photo 1 of 3' });

        expect(dialog.querySelectorAll('img')).toHaveLength(3);
        for (const image of dialog.querySelectorAll('img')) expect(image.getAttribute('alt')).toMatch(/^Photo \d of 3$/);
    });

    it('sits outside the page, in the body', async () => {
        const { container } = renderGrid();
        openFirstPhoto();

        const dialog = await screen.findByRole('dialog');

        expect(container.contains(dialog)).toBe(false);
    });

    it('moves with the side buttons', async () => {
        renderGrid();
        openFirstPhoto();
        const dialog = within(await screen.findByRole('dialog'));

        fireEvent.click(dialog.getByRole('button', { name: 'Next photo' }));
        expect(embla.scrollNext).toHaveBeenCalledTimes(1);

        fireEvent.click(dialog.getByRole('button', { name: 'Previous photo' }));
        expect(embla.scrollPrev).toHaveBeenCalledTimes(1);
    });

    it('moves with the arrow keys', async () => {
        renderGrid();
        openFirstPhoto();
        const dialog = await screen.findByRole('dialog');

        fireEvent.keyDown(dialog, { key: 'ArrowRight' });
        expect(embla.scrollNext).toHaveBeenCalledTimes(1);

        fireEvent.keyDown(dialog, { key: 'ArrowLeft' });
        expect(embla.scrollPrev).toHaveBeenCalledTimes(1);
    });

    it('closes with the close button', async () => {
        renderGrid();
        openFirstPhoto();
        const dialog = within(await screen.findByRole('dialog'));

        fireEvent.click(dialog.getByRole('button', { name: 'Close' }));

        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('closes with Esc', async () => {
        renderGrid();
        openFirstPhoto();
        const dialog = await screen.findByRole('dialog');

        fireEvent.keyDown(dialog, { key: 'Escape' });

        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('closes on a tap beside the photo, not on the photo', async () => {
        renderGrid();
        openFirstPhoto();
        const dialog = await screen.findByRole('dialog');
        const slide = dialog.querySelector('.smd-lightbox-slide') as HTMLElement;

        fireEvent.click(slide.querySelector('img') as HTMLElement);
        expect(screen.getByRole('dialog')).toBeTruthy();

        fireEvent.click(slide);
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('gives focus back to the photo that opened it', async () => {
        renderGrid();
        const opener = screen.getByRole('button', { name: 'Photo 1 of 3' });
        opener.focus();
        fireEvent.click(opener);
        const dialog = within(await screen.findByRole('dialog'));

        fireEvent.click(dialog.getByRole('button', { name: 'Close' }));

        await waitFor(() => expect(document.activeElement).toBe(opener));
    });

    it('has no side buttons with one photo', async () => {
        renderGrid([{ src: '/one.png', alt: 'Photo 1 of 1' }]);
        fireEvent.click(screen.getByRole('button', { name: 'Photo 1 of 1' }));
        const dialog = within(await screen.findByRole('dialog'));

        expect(dialog.queryByRole('button', { name: 'Next photo' })).toBeNull();
        expect(dialog.queryByRole('button', { name: 'Previous photo' })).toBeNull();
    });
});
