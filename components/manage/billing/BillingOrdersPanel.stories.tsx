import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyHostMember } from '@/.storybook/fixtures';
import { BillingOrdersPanel } from '@/components/manage/billing/BillingOrdersPanel';
import { billingData, billingOrder, billingOrders } from '@/components/manage/billing/billingStoryFixtures';
import type { BillingDerived, BillingInsights } from '@/hooks/useEventBillingPanel';

const derived = { visibleOrders: billingOrders, hiddenOrderCount: 0, canManageAddons: true } as BillingDerived;
const insights = { paidTotalMinor: 10400, orderCurrency: 'EUR' } as BillingInsights;

const meta = {
    title: 'Manage/Billing/BillingOrdersPanel',
    component: BillingOrdersPanel,
    decorators: [
        (Story) => (
            <div className="max-w-[390px] p-4">
                <Story />
            </div>
        ),
        withAppContext,
    ],
    parameters: { app: { member: storyHostMember } },
    args: { data: billingData, derived, insights, onShowAllOrders: fn(), onWithdrawAction: fn() },
} satisfies Meta<typeof BillingOrdersPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

// Two paid orders and the total.
export const Orders: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText(copyFor(globals).EventPlanSettingsPage.facts.totalPaid)).toBeVisible();
    },
};

// Inside the withdrawal window: the link on the order opens the withdrawal window.
export const Withdrawable: Story = {
    args: { withdrawableOrderIds: new Set(['ord-activation']) },
    play: async ({ args, canvasElement, globals }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: copyFor(globals).EventPlanSettingsPage.orderWithdrawal.action }));
        await expect(args.onWithdrawAction).toHaveBeenCalled();
    },
};

// A pending extension with its span, a refunded upgrade, and older orders hidden.
export const Mixed: Story = {
    args: {
        derived: {
            ...derived,
            hiddenOrderCount: 4,
            visibleOrders: [
                billingOrder({
                    id: 'ord-ext',
                    kind: 'EXTENSION',
                    status: 'PENDING',
                    amountMinor: 1900,
                    paidAt: null,
                    createdAt: '2026-11-10T10:00:00Z',
                    coverageStartsAt: '2027-03-12T16:00:00Z',
                    coverageEndsAt: '2027-06-12T16:00:00Z',
                }),
                billingOrder({ id: 'ord-up', kind: 'UPGRADE', status: 'REFUNDED', amountMinor: 4900, addonAmountMinor: 500 }),
                ...billingOrders,
            ],
        },
    },
};

// Nothing bought yet.
export const Empty: Story = {
    args: { data: { ...billingData, orders: [] }, derived: { ...derived, visibleOrders: [] }, insights: { ...insights, paidTotalMinor: null } },
};
