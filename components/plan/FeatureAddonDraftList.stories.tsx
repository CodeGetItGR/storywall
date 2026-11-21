import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { storyFeatureAddons, storyRsvpAddon, storySaveMyDateAddon } from '@/.storybook/featureAddons';
import { FeatureAddonDraftList } from '@/components/plan/FeatureAddonDraftList';

const setDraftAddon = fn();

// A draft's feature add-ons: add or remove each, paid with the plan (KAN-82).
const meta = {
    title: 'Plan/FeatureAddonDraftList',
    component: FeatureAddonDraftList,
    decorators: [
        (Story) => (
            <div className="max-w-3xl bg-white p-5">
                <Story />
            </div>
        ),
    ],
    args: {
        state: storyFeatureAddons({
            mode: 'draft',
            offers: [
                { service: storySaveMyDateAddon, added: false },
                { service: storyRsvpAddon, added: true },
            ],
            setDraftAddon,
        }),
    },
} satisfies Meta<typeof FeatureAddonDraftList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals);
        await userEvent.click(within(canvasElement).getByRole('button', { name: copy.EventAddonsSettingsPage.features.add }));
        await expect(setDraftAddon).toHaveBeenCalledWith(storySaveMyDateAddon.code, true);
    },
};
