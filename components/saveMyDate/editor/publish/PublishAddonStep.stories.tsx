import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import {
    storyAddonStepCheckout,
    storyAddonStepReady,
    storyDraftActivationItems,
    storyRsvpAddon,
    storySaveMyDateAddon,
} from '@/.storybook/featureAddons';
import { PublishAddonStep } from '@/components/saveMyDate/editor/publish/PublishAddonStep';

// Publish on an event whose plan lacks the invitation but sells it as an add-on (KAN-82).
const meta = {
    title: 'SaveMyDate/Editor/Publish/PublishAddonStep',
    component: PublishAddonStep,
    decorators: [
        (Story) => (
            <div className="max-w-md bg-white p-5 text-sm text-ink">
                <Story />
            </div>
        ),
        withAppContext,
    ],
    args: { checkout: storyAddonStepCheckout({ handleRsvpChange: fn() }), onCancel: fn() },
} satisfies Meta<typeof PublishAddonStep>;

export default meta;
type Story = StoryObj<typeof meta>;

// Save my date is always included; RSVP waits for the host.
export const Default: Story = {
    play: async ({ args, canvasElement, globals }) => {
        const copy = copyFor(globals).InvitationEditor;
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('heading', { name: copy.addOnTitle })).toBeVisible();
        await expect(canvas.getByRole('checkbox', { name: new RegExp(storySaveMyDateAddon.name) })).toBeDisabled();
        await expect(canvas.getByRole('checkbox', { name: new RegExp(storyRsvpAddon.name) })).not.toBeChecked();
        await expect(canvas.getByRole('button', { name: copy.continueToPayment })).toBeDisabled();
        await userEvent.click(canvas.getByRole('button', { name: copy.cancel }));
        await expect(args.onCancel).toHaveBeenCalledOnce();
    },
};

// RSVP ticked and the boxes checked: ready to pay.
export const Ready: Story = {
    args: {
        checkout: storyAddonStepReady({
            rsvpTicked: true,
            totalMinor: storySaveMyDateAddon.priceAmountMinor + storyRsvpAddon.priceAmountMinor,
        }),
    },
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('button', { name: copyFor(globals).InvitationEditor.continueToPayment })).toBeEnabled();
        await expect(canvas.getByText(/38/)).toBeVisible();
    },
};

// The invitation shows no RSVP section, or the event already has RSVP: only Save my date.
export const InvitationOnly: Story = {
    args: {
        checkout: storyAddonStepCheckout({
            step: { mode: 'checkout', saveMyDate: { service: storySaveMyDateAddon, added: false }, rsvp: null },
        }),
    },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).queryByRole('checkbox', { name: new RegExp(storyRsvpAddon.name) })).toBeNull();
    },
};

const draftStep = {
    mode: 'draft',
    saveMyDate: { service: storySaveMyDateAddon, added: false },
    rsvp: { service: storyRsvpAddon, added: true },
} as const;

// A draft event pays with its plan: the plan and its other add-ons come first, and the total is the whole first payment.
export const Draft: Story = {
    args: {
        checkout: storyAddonStepCheckout({ step: draftStep, rsvpTicked: true, draftItems: storyDraftActivationItems(), totalMinor: 15_300 }),
    },
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText(new RegExp(copyFor(globals).PriceBreakdown.items.activation.replace('{plan}', 'Lite')))).toBeVisible();
        await expect(canvas.getByText(copyFor(globals).CheckoutReviewPage.withdrawalTerms.body)).toBeVisible();
    },
};

// The total waits for the draft's price, and payment with it.
export const DraftPricing: Story = {
    args: { checkout: storyAddonStepReady({ step: draftStep, rsvpTicked: true, totalMinor: null, canSubmit: false }) },
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        const totalPrefix = copyFor(globals).EventAddonsSettingsPage.features.total.split('{')[0];
        await expect(canvas.queryByText((text) => text.startsWith(totalPrefix))).toBeNull();
        await expect(canvas.getByRole('button', { name: copyFor(globals).InvitationEditor.continueToPayment })).toBeDisabled();
    },
};

// The payment page is opening.
export const Paying: Story = { args: { checkout: storyAddonStepReady({ canSubmit: false, isPending: true }) } };

// The server refused.
export const Refused: Story = { args: { checkout: storyAddonStepReady({ error: 'This feature is already on your event.' }) } };

// On a phone.
export const Phone: Story = {
    args: { checkout: storyAddonStepReady({ rsvpTicked: true }) },
    globals: { viewport: { value: 'mobile' } },
};
