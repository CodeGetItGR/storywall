import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { ShareAfterUploadSheet } from '@/components/feed/ShareAfterUploadSheet';

const meta = {
    title: 'Feed/ShareAfterUploadSheet',
    component: ShareAfterUploadSheet,
    parameters: { layout: 'fullscreen' },
    args: { open: true, onShareAction: fn(), onDeclineAction: fn() },
} satisfies Meta<typeof ShareAfterUploadSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};
