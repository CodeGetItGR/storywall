import '@/components/saveMyDate/invitation/invitation.css';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { GalleryGrid } from '@/components/saveMyDate/invitation/sections/media/GalleryGrid';

const IMAGES = [
    { src: '/images/post-flowers.png', alt: 'Photo 1 of 3' },
    { src: '/images/venue.png', alt: 'Photo 2 of 3' },
    { src: '/images/post-cake.png', alt: 'Photo 3 of 3' },
];

// The layouts and shapes are captured on GallerySection, inside the real page.
const meta = {
    title: 'SaveMyDate/Media/GalleryGrid',
    component: GalleryGrid,
    tags: ['visual-skip'],
    decorators: [
        (Story) => (
            <div className="smd-invitation">
                <Story />
            </div>
        ),
    ],
    args: { images: IMAGES, layout: 'grid', shape: 'square', onOpen: fn() },
} satisfies Meta<typeof GalleryGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OpensThePhotoTapped: Story = {
    play: async ({ args, canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: IMAGES[1].alt }));
        await expect(args.onOpen).toHaveBeenCalledWith(1);
    },
};
