import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Flag, Trash2, UserCog } from 'lucide-react';
import { fn, userEvent, within } from 'storybook/test';

import { waitForOpen } from '@/.storybook/waitForOpen';
import { RowActionsMenu } from '@/components/ui/RowActionsMenu';

const meta = {
    title: 'UI/RowActionsMenu',
    component: RowActionsMenu,
    decorators: [
        (Story) => (
            <div className="flex justify-end p-5">
                <Story />
            </div>
        ),
    ],
    args: {
        label: 'More options for Anna',
        items: [
            { key: 'promote', label: 'Make co-host', icon: UserCog, onSelect: fn() },
            { key: 'report', label: 'Report', icon: Flag, onSelect: fn() },
            { key: 'remove', label: 'Remove', icon: Trash2, tone: 'danger', onSelect: fn() },
        ],
    },
} satisfies Meta<typeof RowActionsMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

// The ⋯ button at rest.
export const Default: Story = {};

// The menu open, with the danger item last.
export const Open: Story = {
    play: async ({ canvasElement, args }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: args.label }));
        await waitForOpen('menu');
    },
};
