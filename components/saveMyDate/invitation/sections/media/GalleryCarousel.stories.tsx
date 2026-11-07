import '@/components/saveMyDate/invitation/invitation.css';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { GalleryCarousel } from '@/components/saveMyDate/invitation/sections/media/GalleryCarousel';
import { INVITATION_LABELS } from '@/lib/invitation/labels';

const labels = INVITATION_LABELS.en;

const IMAGES = [
    { src: '/images/post-flowers.png', alt: 'Photo 1 of 3' },
    { src: '/images/venue.png', alt: 'Photo 2 of 3' },
    { src: '/images/post-cake.png', alt: 'Photo 3 of 3' },
];

// Its looks are captured on GallerySection, inside the real page.
const meta = {
    title: 'SaveMyDate/Media/GalleryCarousel',
    component: GalleryCarousel,
    tags: ['visual-skip'],
    decorators: [
        (Story) => (
            <div className="smd-invitation">
                <Story />
            </div>
        ),
    ],
    args: { images: IMAGES, labels, onOpen: fn() },
} satisfies Meta<typeof GalleryCarousel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OpensThePhotoShowing: Story = {
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: labels.nextPhoto }));
        await userEvent.click(canvas.getByRole('button', { name: IMAGES[1].alt }));
        await expect(args.onOpen).toHaveBeenCalledWith(1);
    },
};

export const DotsJump: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: 'Photo 3' }));
        await expect(canvas.getByRole('img', { name: IMAGES[2].alt })).toBeVisible();
    },
};
