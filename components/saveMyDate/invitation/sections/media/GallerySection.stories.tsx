import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { Globals } from 'storybook/internal/types';
import { expect, userEvent, within } from 'storybook/test';

import { labelsFor, LONG_TITLE, onDark, SectionStory, storySection } from '@/.storybook/invitation';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { galleryDotLabel, galleryPhotoAlt } from '@/lib/invitation/gallery';

const MEDIA_IDS = ['m-1', 'm-2', 'm-photo', 'm-top', 'm-leaf', 'm-main-art', 'm-1', 'm-2', 'm-photo', 'm-top'];

const photos = (count: number) => MEDIA_IDS.slice(0, count).map((mediaId) => ({ source: 'media' as const, mediaId }));

const nthPhoto = (position: number, total: number, globals: Globals) => galleryPhotoAlt(position, total, labelsFor(globals));

async function openFirstPhoto(canvasElement: HTMLElement, globals: Globals) {
    await userEvent.click(within(canvasElement).getByRole('button', { name: nthPhoto(1, 6, globals) }));
    return waitForOpen('dialog');
}

const meta = {
    title: 'SaveMyDate/Media/GallerySection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section: storySection('gallery', { images: photos(6), layout: 'grid', shape: 'roundedSquare' }) },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Grid: Story = {};

export const GridRound: Story = {
    args: { section: storySection('gallery', { images: photos(6), layout: 'grid', shape: 'round' }) },
};

export const GridSquare: Story = {
    args: { section: storySection('gallery', { images: photos(6), layout: 'grid', shape: 'square' }) },
};

export const GridRectangle: Story = {
    args: { section: storySection('gallery', { images: photos(6), layout: 'grid', shape: 'rectangle' }) },
};

export const Masonry: Story = {
    args: { section: storySection('gallery', { images: photos(7), layout: 'masonry', shape: 'roundedSquare' }) },
};

// Six photos: the first is wide, and the last one spans two columns on desktop.
export const FeaturedSixPhotos: Story = {
    args: { section: storySection('gallery', { images: photos(6), layout: 'featured', shape: 'roundedSquare' }) },
};

export const FeaturedSevenPhotos: Story = {
    args: { section: storySection('gallery', { images: photos(7), layout: 'featured', shape: 'square' }) },
};

export const FeaturedRectangle: Story = {
    args: { section: storySection('gallery', { images: photos(6), layout: 'featured', shape: 'rectangle' }) },
};

export const Carousel: Story = {
    args: { section: storySection('gallery', { images: photos(4), layout: 'carousel' }) },
};

export const CarouselAfterNext: Story = {
    args: { section: storySection('gallery', { images: photos(4), layout: 'carousel' }) },
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        const labels = labelsFor(globals);
        await userEvent.click(canvas.getByRole('button', { name: labels.nextPhoto }));
        await expect(canvas.getByRole('img', { name: nthPhoto(2, 4, globals) })).toBeVisible();
        await expect(canvas.getByRole('button', { name: galleryDotLabel(2, labels) })).toHaveClass('active');
    },
};

export const CarouselGoesRound: Story = {
    tags: ['visual-skip'],
    args: { section: storySection('gallery', { images: photos(4), layout: 'carousel' }) },
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: labelsFor(globals).previousPhoto }));
        await expect(canvas.getByRole('img', { name: nthPhoto(4, 4, globals) })).toBeVisible();
    },
};

export const OnePhoto: Story = {
    args: { section: storySection('gallery', { images: photos(1) }) },
};

export const TenPhotos: Story = {
    args: { section: storySection('gallery', { images: photos(10) }) },
};

export const LongTitle: Story = {
    args: { section: storySection('gallery', { images: photos(3), title: LONG_TITLE }) },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(storySection('gallery', { images: photos(3) })) },
};

// Guests see nothing for a gallery with no photos, so there is nothing to capture.
export const NoPhotos: Story = {
    tags: ['visual-skip'],
    args: { section: storySection('gallery', { images: [] }) },
    play: async ({ canvasElement }) => {
        await expect(canvasElement.querySelector('.gallery-editor')).toBeNull();
    },
};

export const PhotoOpenFullScreen: Story = {
    play: async ({ canvasElement, globals }) => {
        const dialog = await openFirstPhoto(canvasElement, globals);
        await expect(dialog).toHaveAccessibleName(nthPhoto(1, 6, globals));
    },
};

export const FullScreenCloses: Story = {
    tags: ['visual-skip'],
    play: async ({ canvasElement, globals }) => {
        const dialog = await openFirstPhoto(canvasElement, globals);
        await userEvent.click(within(dialog).getByRole('button', { name: labelsFor(globals).close }));
        await expect(within(document.body).queryByRole('dialog')).toBeNull();
    },
};
