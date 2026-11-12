import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { QrSentArt } from '@/components/qrGuest/QrSentArt';

const meta = {
    title: 'QrGuest/QrSentArt',
    component: QrSentArt,
    decorators: [
        (Story) => (
            <div className="flex justify-center bg-background p-8">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof QrSentArt>;

export default meta;
type Story = StoryObj<typeof meta>;

// After a guest's photos are sent.
export const Upload: Story = { args: { kind: 'upload' } };

// After a guest's wish is sent.
export const Wish: Story = { args: { kind: 'wish' } };
