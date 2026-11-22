import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { FeedEditBanner } from '@/components/manage/overview/FeedEditBanner';
import { FeedEditBannerPlaceholder } from '@/components/manage/overview/FeedEditBannerPlaceholder';

const meta = {
    title: 'Manage/Overview/FeedEditBanner',
    component: FeedEditBanner,
    args: { state: 'included', href: '/events/e-1/feed?edit=blocks', illustration: <FeedEditBannerPlaceholder /> },
} satisfies Meta<typeof FeedEditBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Included: Story = {};
export const Locked: Story = { args: { state: 'locked', href: '/events/e-1/settings/addons?add=SMD' } };
