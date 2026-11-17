import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { storySaveMyDateAddon } from '@/.storybook/featureAddons';
import { FeatureAddonLabel } from '@/components/plan/FeatureAddonLabel';

// One feature add-on in a list: icon, name and one-time price (KAN-82).
const meta = {
    title: 'Plan/FeatureAddonLabel',
    component: FeatureAddonLabel,
    decorators: [
        (Story) => (
            <div className="flex max-w-md bg-white p-5">
                <Story />
            </div>
        ),
    ],
    args: { service: storySaveMyDateAddon },
} satisfies Meta<typeof FeatureAddonLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText(storySaveMyDateAddon.name)).toBeVisible();
    },
};
