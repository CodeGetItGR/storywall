import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { withAppContext } from '@/.storybook/appContext';
import { storyEvent, storyPhotos } from '@/.storybook/fixtures';
import { FeedCoverBlock } from '@/components/feed/layout/FeedCoverBlock';
import { FeedEditBanner } from '@/components/manage/overview/FeedEditBanner';
import { FeedEditBannerPlaceholder } from '@/components/manage/overview/FeedEditBannerPlaceholder';
import { FeedEditBannerFrame } from '@/components/manage/overview/FeedEditBannerPreview';

// The event's cover photo in the banner's own frame, as the Overview draws it on the wall look.
const cover = (
    <FeedEditBannerFrame>
        <FeedCoverBlock event={storyEvent({ coverMedia: storyPhotos[0] })} isHost={false} wishlist={false} thumbnail />
    </FeedEditBannerFrame>
);

const meta = {
    title: 'Manage/Overview/FeedEditBanner',
    component: FeedEditBanner,
    decorators: [withAppContext],
    args: { state: 'included', href: '/events/e-1/feed?edit=blocks', illustration: cover },
} satisfies Meta<typeof FeedEditBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Included: Story = {};
export const Locked: Story = { args: { state: 'locked', href: '/events/e-1/settings/addons?add=SMD' } };
// While the picture's data or code loads.
export const Loading: Story = { args: { illustration: <FeedEditBannerPlaceholder /> } };
