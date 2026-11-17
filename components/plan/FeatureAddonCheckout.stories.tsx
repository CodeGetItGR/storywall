import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { storyFeatureAddonsReady } from '@/.storybook/featureAddons';
import { FeatureAddonCheckout } from '@/components/plan/FeatureAddonCheckout';

const pay = fn();

// A live event's feature add-ons: tick, check the boxes, pay once (KAN-82).
const meta = {
    title: 'Plan/FeatureAddonCheckout',
    component: FeatureAddonCheckout,
    decorators: [
        withAppContext,
        (Story) => (
            <div className="max-w-3xl bg-white p-5">
                <Story />
            </div>
        ),
    ],
    args: { state: storyFeatureAddonsReady({ pay }) },
} satisfies Meta<typeof FeatureAddonCheckout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: /38/ }));
        await expect(pay).toHaveBeenCalled();
    },
};
