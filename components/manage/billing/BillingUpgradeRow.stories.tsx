import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyHostMember } from '@/.storybook/fixtures';
import { BillingUpgradeRow } from '@/components/manage/billing/BillingUpgradeRow';
import type { BillingUpgradeRow as BillingUpgradeRowData } from '@/hooks/useBillingUpgradeRows';

const row: BillingUpgradeRowData = {
    code: 'PREMIUM_PLUS',
    name: 'Premium Plus',
    durations: [
        { id: 'cov-3', months: 3 },
        { id: 'cov-6', months: 6 },
    ],
    durationId: 'cov-3',
    monthsAdded: 3,
    href: '/events/evt-billing/checkout/review?intent=upgrade',
    priceLabel: '€49 now',
    buttonLabel: 'Upgrade',
    buttonAriaLabel: 'Upgrade to Premium Plus, 3 months, €49',
    listPriceLabel: null,
    discountLabel: null,
    chips: ['50 GB storage', '250 members', '+2 features'],
    removedModuleKeys: [],
};

const meta = {
    title: 'Manage/Billing/BillingUpgradeRow',
    component: BillingUpgradeRow,
    decorators: [
        (Story) => (
            <ul className="max-w-[390px] p-4">
                <Story />
            </ul>
        ),
        withAppContext,
    ],
    parameters: { app: { member: storyHostMember } },
    args: { row, eventTypeKey: 'WEDDING', onDurationChangeAction: fn() },
} satisfies Meta<typeof BillingUpgradeRow>;

export default meta;
type Story = StoryObj<typeof meta>;

// The mockup's card: price now, months added, what changes, Upgrade.
export const Card: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        const copy = copyFor(globals).EventPlanSettingsPage;
        await expect(canvas.getByText(copy.upgrade.whatChanges)).toBeVisible();
        await expect(canvas.getByRole('link', { name: row.buttonAriaLabel })).toBeVisible();
    },
};

// A discount code: the full price crossed out before the price now.
export const Discounted: Story = {
    args: { row: { ...row, listPriceLabel: '€69', discountLabel: 'SPRING' } },
};

// An upgrade that drops a feature the current plan has.
export const DropsAFeature: Story = {
    args: { row: { ...row, removedModuleKeys: ['wishbook'] } },
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText(copyFor(globals).EventPlanSettingsPage.compare.removedModules)).toBeVisible();
    },
};
