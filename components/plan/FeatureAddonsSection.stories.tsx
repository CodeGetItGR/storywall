import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyFeatureAddons, storyFeatureAddonsReady, storyGalleryAddon, storyRsvpAddon, storySaveMyDateAddon } from '@/.storybook/featureAddons';
import { FeatureAddonsSection } from '@/components/plan/FeatureAddonsSection';

// "Add features" on the event's Add-ons page (KAN-82): features the plan sells as one-time add-ons.
const meta = {
    title: 'Plan/FeatureAddonsSection',
    component: FeatureAddonsSection,
    decorators: [
        withAppContext,
        (Story) => (
            <div className="max-w-3xl bg-white p-5">
                <Story />
            </div>
        ),
    ],
    args: { state: storyFeatureAddons({ toggle: fn(), pay: fn(), setDraftAddon: fn() }) },
} satisfies Meta<typeof FeatureAddonsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

// A live event, nothing ticked yet: each feature with its one-time price.
export const Default: Story = {
    play: async ({ args, canvasElement, globals }) => {
        const copy = copyFor(globals);
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('heading', { name: copy.EventAddonsSettingsPage.features.title })).toBeVisible();
        await userEvent.click(canvas.getByRole('checkbox', { name: new RegExp(storyRsvpAddon.name) }));
        await expect(args.state.toggle).toHaveBeenCalledWith(storyRsvpAddon.code);
    },
};

// Opened from "Add the invitation": Save my date already ticked, the boxes still to check.
export const Preselected: Story = {
    args: {
        state: storyFeatureAddons({
            selectedCodes: new Set([storySaveMyDateAddon.code]),
            pickedCount: 1,
            totalMinor: storySaveMyDateAddon.priceAmountMinor,
        }),
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('checkbox', { name: new RegExp(storySaveMyDateAddon.name) })).toBeChecked();
        await expect(canvas.getByRole('button', { name: /29/ })).toBeDisabled();
    },
};

// Two features ticked and the boxes checked: the total and the pay button.
export const ReadyToPay: Story = {
    args: { state: storyFeatureAddonsReady({ pay: fn() }) },
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        const pay = canvas.getByRole('button', { name: /38/ });
        await expect(pay).toBeEnabled();
        await userEvent.click(pay);
        await expect(args.state.pay).toHaveBeenCalled();
    },
};

// The payment page is opening.
export const Paying: Story = { args: { state: storyFeatureAddonsReady({ isPaying: true, canPay: false }) } };

// A whole-event withdrawal is under review: nothing can be bought until it's decided.
export const Paused: Story = {
    args: { state: storyFeatureAddonsReady({ paused: true, canPay: false }) },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals);
        const canvas = within(canvasElement);
        await expect(canvas.getByText(copy.EventAddonsSettingsPage.features.paused)).toBeVisible();
        await expect(canvas.queryByRole('button')).toBeNull();
    },
};

// A co-host sees the features but can't buy them.
export const CoHost: Story = {
    args: { state: storyFeatureAddons({ purchaseBlock: 'primaryHostOnly', canPurchase: false }) },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals);
        const canvas = within(canvasElement);
        await expect(canvas.getByText(copy.Common.primaryHostOnly)).toBeVisible();
        await expect(canvas.getByRole('checkbox', { name: new RegExp(storyRsvpAddon.name) })).toBeDisabled();
    },
};

// The server refused the payment.
export const Refused: Story = {
    args: { state: storyFeatureAddonsReady({ error: 'This feature is already on your event.' }) },
};

// A draft adds features to its plan's payment, one at a time; RSVP is already added.
export const Draft: Story = {
    args: {
        state: storyFeatureAddons({
            mode: 'draft',
            offers: [
                { service: storySaveMyDateAddon, added: false },
                { service: storyRsvpAddon, added: true },
                { service: storyGalleryAddon, added: false },
            ],
            setDraftAddon: fn(),
        }),
    },
    play: async ({ args, canvasElement, globals }) => {
        const copy = copyFor(globals);
        const canvas = within(canvasElement);
        await expect(canvas.getByText(copy.EventAddonsSettingsPage.features.draftNote)).toBeVisible();
        await userEvent.click(canvas.getAllByRole('button', { name: copy.EventAddonsSettingsPage.features.remove })[0]!);
        await expect(args.state.setDraftAddon).toHaveBeenCalledWith(storyRsvpAddon.code, false);
    },
};

// A draft's change is being saved.
export const DraftSaving: Story = {
    args: {
        state: storyFeatureAddons({
            mode: 'draft',
            offers: [
                { service: storySaveMyDateAddon, added: false },
                { service: storyRsvpAddon, added: true },
            ],
            pendingCode: storySaveMyDateAddon.code,
        }),
    },
};

// On a phone, ready to pay.
export const Phone: Story = {
    args: { state: storyFeatureAddonsReady() },
    globals: { viewport: { value: 'mobile' } },
};

// On a phone, a draft.
export const DraftPhone: Story = {
    args: Draft.args,
    globals: { viewport: { value: 'mobile' } },
};
