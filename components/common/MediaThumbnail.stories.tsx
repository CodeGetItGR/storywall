import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { MediaThumbnail } from '@/components/common/MediaThumbnail';

const meta = {
    title: 'Common/MediaThumbnail',
    component: MediaThumbnail,
    args: {
        src: '/images/post-florals.png',
        mediaType: 'IMAGE',
        alt: 'Table flowers',
        fill: true,
        sizes: '200px',
        className: 'object-cover',
    },
    // The thumbnail fills its tile, as it does in the gallery grid.
    decorators: [
        (Story) => (
            <div className="relative aspect-square w-48 overflow-hidden rounded-lg">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof MediaThumbnail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Image: Story = {};

export const VideoWithThumbnail: Story = {
    args: { mediaType: 'VIDEO', src: '/landing/01-bachelor-santorini.webp', thumbnailUrl: '/images/post-cake.png' },
};

export const VideoProcessing: Story = {
    args: { mediaType: 'VIDEO', status: 'PROCESSING', src: null },
};

export const VideoFailed: Story = {
    args: { mediaType: 'VIDEO', status: 'FAILED', src: null },
};
