import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyHostMember } from '@/.storybook/fixtures';
import { BillingAddonsSection } from '@/components/manage/billing/BillingAddonsSection';

const meta = {
    title: 'Manage/Billing/BillingAddonsSection',
    component: BillingAddonsSection,
    decorators: [
        (Story) => (
            <div className="max-w-[390px] p-4">
                <Story />
            </div>
        ),
        withAppContext,
    ],
    parameters: { app: { member: storyHostMember } },
    args: {
        eventId: 'evt-billing',
        currency: 'EUR',
        canManage: true,
        addons: [{ code: 'STORAGE_20GB', name: 'Extra 20 GB', priceAmountMinor: 1500, billingPeriod: 'ONE_TIME', activatedAt: '2026-10-02T10:00:00Z' }],
    },
} satisfies Meta<typeof BillingAddonsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

// One owned add-on and the Manage add-ons button.
export const Owned: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('link', { name: copyFor(globals).EventPlanSettingsPage.addons.manageAction })).toBeVisible();
    },
};

// Nothing bought yet: the line and Add storage.
export const Empty: Story = {
    args: { addons: [] },
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('link', { name: copyFor(globals).EventPlanSettingsPage.addons.addStorage })).toBeVisible();
    },
};
