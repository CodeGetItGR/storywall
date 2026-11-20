import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { storySaveMyDateAddon } from '@/.storybook/featureAddons';
import { PlanAddonLine } from '@/components/plan/PlanAddonLine';

// Under a plan without the invitation: the add-on that joins its payment (KAN-82).
const meta = {
    title: 'Plan/PlanAddonLine',
    component: PlanAddonLine,
    decorators: [
        (Story) => (
            <div className="max-w-md bg-white p-5">
                <Story />
            </div>
        ),
        withAppContext,
    ],
    args: { service: storySaveMyDateAddon },
} satisfies Meta<typeof PlanAddonLine>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText(new RegExp(`^\\+ ${storySaveMyDateAddon.name} · `))).toBeVisible();
    },
};
