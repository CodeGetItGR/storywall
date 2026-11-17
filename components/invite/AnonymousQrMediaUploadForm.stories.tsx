import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { AnonymousQrMediaUploadForm } from '@/components/invite/AnonymousQrMediaUploadForm';

const meta = {
    title: 'Invite/AnonymousQrMediaUploadForm',
    component: AnonymousQrMediaUploadForm,
    args: { token: 'story-token', onSentChange: fn() },
    decorators: [
        (Story) => (
            <div className="mx-auto max-w-xl bg-background px-5 py-6">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof AnonymousQrMediaUploadForm>;

export default meta;
type Story = StoryObj<typeof meta>;

// A guest without an account: an optional name and the tick box.
export const Guest: Story = {};

// A signed-in member uploads as themselves: their name, read-only, and no tick box.
export const Member: Story = { args: { member: { eventId: 'event-1', displayName: 'Maria Papadopoulou' } } };
