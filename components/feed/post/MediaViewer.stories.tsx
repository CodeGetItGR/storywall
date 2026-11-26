import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { storyPhotos } from '@/.storybook/fixtures';
import { MediaViewer } from '@/components/feed/post/MediaViewer';

// Fullscreen, with nothing under the photo. PostMediaViewer's stories show it with a post.
const meta = {
    title: 'Feed/Post/MediaViewer',
    component: MediaViewer,
    args: { items: [], index: 0, onIndexChange: fn(), onCloseAction: fn() },
    parameters: { layout: 'fullscreen' },
    render: (args, { globals }) => {
        const alt = copyFor(globals).FeedSections.pinned.photoAlt.replace('{number}', '1').replace('{count}', '1');
        return <MediaViewer {...args} items={[{ ...storyPhotos[0], alt }]} />;
    },
} satisfies Meta<typeof MediaViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SinglePhoto: Story = {};
