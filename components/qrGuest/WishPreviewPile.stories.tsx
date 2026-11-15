import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { WishPreviewPile } from '@/components/qrGuest/WishPreviewPile';

const meta = {
    title: 'QrGuest/WishPreviewPile',
    component: WishPreviewPile,
    decorators: [
        (Story) => (
            <div className="bg-background p-8">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof WishPreviewPile>;

export default meta;
type Story = StoryObj<typeof meta>;

// Before the guest types: the field labels, faded.
export const Empty: Story = { args: { message: '', guestName: '' } };

// While the guest types.
export const Typed: Story = { args: { message: 'Να ζήσετε! Wishing you a lifetime of laughter.', guestName: 'Eleni' } };

// A long wish is cut after four lines.
export const Long: Story = {
    args: {
        message:
            'Wishing you both a lifetime of laughter, long dinners with friends, quiet mornings together and many more trips like the one where you met. We love you and we are so happy for you.',
        guestName: 'Eleni and Giorgos Papadopoulos',
    },
};
