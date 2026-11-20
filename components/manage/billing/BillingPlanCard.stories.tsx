import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyHostMember } from '@/.storybook/fixtures';
import { BillingPlanCard } from '@/components/manage/billing/BillingPlanCard';
import { billingData, billingSchedule, billingUsage } from '@/components/manage/billing/billingStoryFixtures';

const meta = {
    title: 'Manage/Billing/BillingPlanCard',
    component: BillingPlanCard,
    decorators: [
        (Story) => (
            <div className="max-w-[390px] p-4">
                <Story />
            </div>
        ),
        withAppContext,
    ],
    parameters: { app: { member: storyHostMember } },
    args: { data: billingData, schedule: billingSchedule, usage: billingUsage },
} satisfies Meta<typeof BillingPlanCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Plan, Photos kept until, and the storage and members bars.
export const Plan: Story = {
    play: async ({ canvasElement, globals }) => {
        const canvas = within(canvasElement);
        const copy = copyFor(globals).EventPlanSettingsPage;
        await expect(canvas.getByText(copy.coverage.keptUntil)).toBeVisible();
        await expect(canvas.getByText('/ 100')).toBeVisible();
    },
};

// A discount code and unlimited members.
export const DiscountUnlimited: Story = {
    args: {
        data: { ...billingData, discount: { label: 'SPRING', discountPercent: 20, appliedAt: '2026-09-12T10:00:00Z' } },
        usage: { ...billingUsage, memberLimit: null },
    },
};

// Desktop width: the three facts in one row.
export const Wide: Story = {
    decorators: [
        (Story) => (
            <div className="w-[860px] p-4">
                <Story />
            </div>
        ),
    ],
};
