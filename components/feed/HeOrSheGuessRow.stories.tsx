import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { HeOrSheGuessRow } from '@/components/feed/HeOrSheGuessRow';

const meta = {
    title: 'Feed/HeOrSheGuessRow',
    component: HeOrSheGuessRow,
    args: { isSending: false, error: null, onGuessAction: fn() },
    decorators: [
        (Story) => (
            <div className="mx-auto max-w-2xl">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof HeOrSheGuessRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};

export const Sending: Story = { args: { isSending: true } };
