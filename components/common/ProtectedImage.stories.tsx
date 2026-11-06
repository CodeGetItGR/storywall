import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ProtectedImage } from '@/components/common/ProtectedImage';

const meta = {
    title: 'Common/ProtectedImage',
    component: ProtectedImage,
    args: { src: '/images/post-florals.png', alt: 'Table flowers', width: 320, height: 240, className: 'rounded-lg object-cover' },
} satisfies Meta<typeof ProtectedImage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// Fills its frame, as it does in banners and avatars.
export const Fill: Story = {
    args: { width: undefined, height: undefined, fill: true, sizes: '320px' },
    decorators: [
        (Story) => (
            <div className="relative aspect-video w-80 overflow-hidden rounded-xl">
                <Story />
            </div>
        ),
    ],
};
