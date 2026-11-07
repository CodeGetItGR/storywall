import '@/components/saveMyDate/invitation/invitation.css';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { waitForOpen } from '@/.storybook/waitForOpen';
import { GalleryLightbox } from '@/components/saveMyDate/invitation/sections/media/GalleryLightbox';
import { INVITATION_LABELS } from '@/lib/invitation/labels';

const IMAGES = [
    { src: '/images/post-flowers.png', alt: 'Photo 1 of 3' },
    { src: '/images/venue.png', alt: 'Photo 2 of 3' },
    { src: '/images/post-cake.png', alt: 'Photo 3 of 3' },
];

const meta = {
    title: 'SaveMyDate/Media/GalleryLightbox',
    component: GalleryLightbox,
    args: { images: IMAGES, startIndex: 0, labels: INVITATION_LABELS.en, onClose: fn() },
} satisfies Meta<typeof GalleryLightbox>;

export default meta;
type Story = StoryObj<typeof meta>;

// The keys are handled on the dialog, and focus reaches it just after it opens.
async function openWithFocus() {
    const dialog = await waitForOpen('dialog');
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    return dialog;
}

export const Default: Story = {
    play: async () => {
        await waitForOpen('dialog');
    },
};

export const StartsOnALaterPhoto: Story = {
    args: { startIndex: 1 },
    play: async () => {
        const dialog = await waitForOpen('dialog');
        await expect(dialog).toHaveAccessibleName(IMAGES[1].alt);
    },
};

// Nothing to move to, so no side buttons.
export const OnePhoto: Story = {
    args: { images: IMAGES.slice(0, 1) },
    play: async () => {
        const dialog = await waitForOpen('dialog');
        await expect(within(dialog).queryByRole('button', { name: INVITATION_LABELS.en.nextPhoto })).toBeNull();
    },
};

export const NextButton: Story = {
    tags: ['visual-skip'],
    play: async () => {
        const dialog = await waitForOpen('dialog');
        await userEvent.click(within(dialog).getByRole('button', { name: INVITATION_LABELS.en.nextPhoto }));
        await waitFor(() => expect(dialog).toHaveAccessibleName(IMAGES[1].alt));
    },
};

export const GoesRoundFromTheFirstPhoto: Story = {
    tags: ['visual-skip'],
    play: async () => {
        const dialog = await openWithFocus();
        await userEvent.keyboard('{ArrowLeft}');
        await waitFor(() => expect(dialog).toHaveAccessibleName(IMAGES[2].alt));
    },
};

export const ArrowKeys: Story = {
    tags: ['visual-skip'],
    play: async () => {
        const dialog = await openWithFocus();
        await userEvent.keyboard('{ArrowRight}');
        await waitFor(() => expect(dialog).toHaveAccessibleName(IMAGES[1].alt));
    },
};

export const EscCloses: Story = {
    tags: ['visual-skip'],
    play: async ({ args }) => {
        await openWithFocus();
        await userEvent.keyboard('{Escape}');
        await waitFor(() => expect(args.onClose).toHaveBeenCalled());
    },
};
