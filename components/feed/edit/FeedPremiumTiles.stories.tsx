import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { FeedPremiumTiles } from '@/components/feed/edit/FeedPremiumTiles';
import { PREMIUM_TILE_MODULES, type PremiumTile } from '@/lib/feedModuleTiles';

const adds: PremiumTile[] = PREMIUM_TILE_MODULES.map((module) => ({ module, action: 'add' }));

const meta = {
    title: 'Feed/Edit/FeedPremiumTiles',
    component: FeedPremiumTiles,
    args: { tiles: adds.slice(0, 4), eventId: 'e1', eventType: 'WEDDING', onAdd: fn() },
    decorators: [
        (Story) => (
            <div className="max-w-md bg-white p-5">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof FeedPremiumTiles>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FourTiles: Story = {};
export const EightTiles: Story = { args: { tiles: adds } };

export const Expanded: Story = {
    args: { tiles: adds },
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: copyFor(globals).FeedEditor.premiumMore }));
        await expect(canvas.getAllByRole('listitem')).toHaveLength(8);
    },
};

// A module the event lacks but its plan sells opens the add-on's purchase.
export const WithPurchase: Story = {
    args: { tiles: [adds[0], { module: 'wishbook', action: 'buy', addonCode: 'ADD_WISHBOOK' }, adds[2], adds[3], adds[4]] },
};
