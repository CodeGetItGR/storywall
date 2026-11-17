import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { ShareInviteTab } from '@/components/layout/mobile-tab-bar/ShareInviteTab';

const meta = {
    title: 'Layout/MobileTabBar/ShareInviteTab',
    component: ShareInviteTab,
    args: { copied: false, onShare: fn() },
    decorators: [
        (Story) => (
            <div className="h-16 w-16">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof ShareInviteTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Copied: Story = {
    args: { copied: true },
};
