import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { AskDatesButton } from '@/components/vendors/inquiries/AskDatesButton';

const meta = {
    title: 'Vendors/Inquiries/AskDatesButton',
    component: AskDatesButton,
    args: { state: { canAsk: true, sentAt: null }, onAskAction: fn() },
    decorators: [
        (Story) => (
            <div className="p-4">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof AskDatesButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CanAsk: Story = {};

export const AlreadySent: Story = {
    args: { state: { canAsk: false, sentAt: '2026-06-14T10:00:00Z' } },
};
