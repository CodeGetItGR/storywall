import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { storyComment, storyMedia, storyPhotos, storyPost } from '@/.storybook/fixtures';
import { PostMediaViewer } from '@/components/feed/post/PostMediaViewer';

const post = storyPost({
    media: storyPhotos,
    reactionCount: 12,
    reactionCounts: { LOVE: 8, LAUGH: 3, WOW: 1 },
    commentCount: 2,
    recentComments: [storyComment('c1'), storyComment('c2')],
});

// Fullscreen. Also shows PostMediaCarousel, PostMediaImageSlide and PostMediaViewerInfo.
const meta = {
    title: 'Feed/Post/PostMediaViewer',
    component: PostMediaViewer,
    args: { post, media: post.media, initialIndex: 0, alt: 'Photo by Eleni Georgiou', onCloseAction: fn() },
    parameters: { layout: 'fullscreen' },
    decorators: [withAppContext],
} satisfies Meta<typeof PostMediaViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Several: Story = {};

export const OnLastPhoto: Story = {
    args: { initialIndex: 4 },
};

export const SinglePhoto: Story = {
    args: { post: { ...post, media: [storyPhotos[0]] }, media: [storyPhotos[0]] },
};

export const LongCaption: Story = {
    args: {
        post: {
            ...post,
            content:
                'What a day. Thank you to everyone who travelled from near and far to be with us, to the band who kept the dance floor full until three, and to our parents for everything. We read every message and looked at every photo twice. Please keep sharing them here so we can relive it all.',
        },
    },
};

export const VideoProcessing: Story = {
    args: { media: [storyMedia('v1', { mediaType: 'VIDEO', mimeType: 'video/mp4', status: 'PROCESSING', mediaUrl: '' })] },
};

export const VideoFailed: Story = {
    args: { media: [storyMedia('v1', { mediaType: 'VIDEO', mimeType: 'video/mp4', status: 'FAILED', mediaUrl: '' })] },
};
