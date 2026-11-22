import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { storyRsvpAddon, storySaveMyDateAddon } from '@/.storybook/featureAddons';
import { FeatureAddonCheckRow } from '@/components/plan/FeatureAddonCheckRow';

// One feature add-on as a checkbox row (KAN-82): always included, or one the host ticks.
const meta = {
    title: 'Plan/FeatureAddonCheckRow',
    component: FeatureAddonCheckRow,
    decorators: [
        (Story) => (
            <div className="max-w-md bg-white p-5 text-sm text-ink">
                <Story />
            </div>
        ),
        withAppContext,
    ],
    args: { service: storyRsvpAddon, checked: false },
} satisfies Meta<typeof FeatureAddonCheckRow>;

export default meta;
type Story = StoryObj<typeof meta>;

// Without a change handler the add-on can't be unticked.
export const Included: Story = {
    args: { service: storySaveMyDateAddon, checked: true },
    play: async ({ canvasElement }) => {
        const box = within(canvasElement).getByRole('checkbox', { name: new RegExp(storySaveMyDateAddon.name) });
        await expect(box).toBeChecked();
        await expect(box).toBeDisabled();
    },
};

export const Tickable: Story = {
    args: { onChange: fn() },
    play: async ({ args, canvasElement }) => {
        const box = within(canvasElement).getByRole('checkbox', { name: new RegExp(storyRsvpAddon.name) });
        await expect(box).toBeEnabled();
        await userEvent.click(box);
        await expect(args.onChange).toHaveBeenCalledOnce();
    },
};

export const Ticked: Story = { args: { checked: true, onChange: fn() } };

// While paying the row can't be changed.
export const Paying: Story = {
    args: { checked: true, onChange: fn(), disabled: true },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('checkbox')).toBeDisabled();
    },
};
