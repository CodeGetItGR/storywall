import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { QrStatsPreview } from '@/components/manage/invitations/QrStatsPreview';
import type { QrLinkStatsDto } from '@/lib/api/types';

const stats: QrLinkStatsDto = {
    qrLinkId: 'qr-story',
    label: null,
    labelKey: null,
    targetType: 'EVENT_JOIN',
    status: 'ACTIVE',
    joinCount: 42,
    maxGuests: 100,
    remainingSlots: 58,
    lastJoinedAt: '2026-11-10T18:30:00Z',
    uploadCount: 17,
};

const meta = {
    title: 'Manage/Invitations/QrStatsPreview',
    component: QrStatsPreview,
    decorators: [
        withAppContext,
        (Story) => (
            <div className="max-w-md bg-background p-4">
                <Story />
            </div>
        ),
    ],
    args: { stats, lowSlots: null, onSeeMore: fn() },
} satisfies Meta<typeof QrStatsPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Numbers: Story = {};

// Five or fewer slots left: a short warning under the numbers.
export const LowSlots: Story = { args: { stats: { ...stats, joinCount: 97, remainingSlots: 3 }, lowSlots: 3 } };
