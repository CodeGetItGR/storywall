import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { GuestWishForm } from '@/components/qrGuest/GuestWishForm';

const meta = {
    title: 'QrGuest/GuestWishForm',
    component: GuestWishForm,
    args: { token: 'story-token', onSentChange: fn() },
    decorators: [
        (Story) => (
            <div className="mx-auto max-w-xl bg-background px-5 py-6">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof GuestWishForm>;

export default meta;
type Story = StoryObj<typeof meta>;

// A guest opens the wish form from a scanned code.
export const Empty: Story = {};
