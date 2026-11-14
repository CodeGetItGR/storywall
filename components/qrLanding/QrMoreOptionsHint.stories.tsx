import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { QrMoreOptionsHint } from '@/components/qrLanding/QrMoreOptionsHint';

const meta = {
    title: 'QrLanding/QrMoreOptionsHint',
    component: QrMoreOptionsHint,
    args: { onReveal: fn() },
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <div className="h-64 bg-background">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof QrMoreOptionsHint>;

export default meta;
type Story = StoryObj<typeof meta>;

// The fade along the bottom of the screen.
export const Default: Story = {};
