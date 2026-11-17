import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { copyFor } from '@/.storybook/copy';
import { BillingAddonsSection } from '@/components/manage/billing/BillingAddonsSection';

// The billing tab's add-ons row and its link to the Add-ons page.
const meta = {
    title: 'Manage/Billing/BillingAddonsSection',
    component: BillingAddonsSection,
    decorators: [
        (Story) => (
            <div className="max-w-3xl bg-white p-5">
                <Story />
            </div>
        ),
    ],
    args: { eventId: 'evt-story', addons: [], currency: 'EUR', canManage: true },
} satisfies Meta<typeof BillingAddonsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

// Only storage is on offer.
export const StorageOnly: Story = {
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals);
        await expect(within(canvasElement).getByRole('link', { name: copy.EventPlanSettingsPage.addons.addStorage })).toBeVisible();
    },
};

// Feature add-ons are on offer too (KAN-82).
export const WithFeatureAddons: Story = {
    args: { hasFeatureAddons: true },
    play: async ({ canvasElement, globals }) => {
        const copy = copyFor(globals);
        await expect(within(canvasElement).getByRole('link', { name: copy.EventPlanSettingsPage.addons.manageAction })).toBeVisible();
    },
};

// An add-on already bought.
export const Owned: Story = {
    args: {
        hasFeatureAddons: true,
        addons: [{ code: 'RSVP', name: 'RSVP', priceAmountMinor: 900, billingPeriod: 'ONE_TIME', activatedAt: '2026-06-10T10:00:00Z' }],
    },
};
