import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { PresignedVideo } from '@/components/common/PresignedVideo';

// Stories have no video file to play, so the poster stands in for the first frame.
const meta = {
    title: 'Common/PresignedVideo',
    component: PresignedVideo,
    args: {
        src: '/videos/first-dance.mp4?X-Amz-Signature=story',
        poster: '/images/post-tux.png',
        controls: true,
        playsInline: true,
        preload: 'none',
        className: 'aspect-video w-80 rounded-xl bg-black object-cover',
    },
} satisfies Meta<typeof PresignedVideo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
