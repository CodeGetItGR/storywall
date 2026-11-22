import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';

import { waitForOpen } from '@/.storybook/waitForOpen';
import { eventPlanFixture, extensionFixture } from '@/components/admin/__fixtures__/extensionPlans';
import { ExtensionDrawer } from '@/components/admin/ExtensionDrawer';
import type { ExtensionDrawerState } from '@/hooks/useExtensionDrawer';
import { extensionRowsFromPlans } from '@/lib/adminExtensions';

const PLANS = [
    eventPlanFixture({
        extensionOptions: [extensionFixture(), extensionFixture({ id: 'ext-3', months: 3, priceAmountMinor: 1_500, active: false })],
    }),
    eventPlanFixture({ id: 'plan-premium', code: 'PREMIUM', name: 'Premium' }),
];
const [LIVE, RETIRED] = extensionRowsFromPlans(PLANS).sort((left, right) => Number(right.option.active) - Number(left.option.active));

function drawerState(overrides: Partial<ExtensionDrawerState> = {}): ExtensionDrawerState {
    return {
        open: true,
        editing: null,
        draft: { planTierId: 'plan-classic', months: '', price: '' },
        canSave: false,
        isSaving: false,
        error: null,
        openNew: fn(),
        openEdit: fn(),
        close: fn(),
        updateDraft: fn(),
        save: fn(),
        toggleActive: fn(),
        ...overrides,
    };
}

// The drawer portals itself to the body, with the console's palette on it.
const meta = {
    title: 'Admin/PaidServices/ExtensionDrawer',
    component: ExtensionDrawer,
    args: { plans: PLANS, drawer: drawerState() },
    async play() {
        await expect(await waitForOpen('dialog')).toBeVisible();
    },
} satisfies Meta<typeof ExtensionDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

// New extension: plan, months and price, nothing typed yet.
export const New: Story = {};

// New extension filled in and ready to save.
export const NewFilled: Story = {
    args: { drawer: drawerState({ draft: { planTierId: 'plan-premium', months: '12', price: '49' }, canSave: true }) },
};

// An extension on sale: plan and months fixed, price editable, Retire.
export const EditLive: Story = {
    args: { drawer: drawerState({ editing: LIVE, draft: { planTierId: LIVE.plan.id, months: '6', price: '29' } }) },
};

// A retired extension: Put back on sale.
export const EditRetired: Story = {
    args: { drawer: drawerState({ editing: RETIRED, draft: { planTierId: RETIRED.plan.id, months: '3', price: '15' } }) },
};
