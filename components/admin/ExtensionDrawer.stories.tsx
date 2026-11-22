import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';

import { waitForOpen } from '@/.storybook/waitForOpen';
import { eventPlanFixture, extensionFixture } from '@/components/admin/__fixtures__/extensionPlans';
import { ExtensionDrawer } from '@/components/admin/ExtensionDrawer';
import type { ExtensionDrawerState } from '@/hooks/useExtensionDrawer';
import { extensionPlanGroups, extensionRowsFromPlans } from '@/lib/adminExtensions';

const PLANS = [
    eventPlanFixture({
        extensionOptions: [extensionFixture(), extensionFixture({ id: 'ext-3', months: 3, priceAmountMinor: 1_500, active: false })],
    }),
    eventPlanFixture({ id: 'plan-premium', code: 'PREMIUM', name: 'Premium', sortOrder: 1 }),
    eventPlanFixture({ id: 'plan-baptism', code: 'CLASSIC_BAPTISM', eventTypeKey: 'BAPTISM' }),
    eventPlanFixture({ id: 'plan-baptism-old', code: 'CLASSIC_BAPTISM_OLD', eventTypeKey: 'BAPTISM', isPublic: false, sortOrder: 1 }),
];
const EVENT_TYPE_LABELS: Record<string, string> = { WEDDING: 'Wedding', BAPTISM: 'Baptism' };
const eventTypeLabel = (key: string) => EVENT_TYPE_LABELS[key] ?? key;
const GROUPS = extensionPlanGroups(PLANS, ['WEDDING', 'BAPTISM']).map((group) => ({ ...group, label: eventTypeLabel(group.eventTypeKey) }));
const [LIVE, RETIRED] = extensionRowsFromPlans(PLANS).sort((left, right) => Number(right.option.active) - Number(left.option.active));

function drawerState(overrides: Partial<ExtensionDrawerState> = {}): ExtensionDrawerState {
    return {
        open: true,
        editing: null,
        draft: { planTierIds: [], months: '', price: '' },
        sellingLength: new Set<string>(),
        canSave: false,
        isSaving: false,
        error: null,
        openNew: fn(),
        openEdit: fn(),
        close: fn(),
        updateDraft: fn(),
        togglePlan: fn(),
        save: fn(),
        toggleActive: fn(),
        ...overrides,
    };
}

// The drawer portals itself to the body, with the console's palette on it.
const meta = {
    title: 'Admin/PaidServices/ExtensionDrawer',
    component: ExtensionDrawer,
    args: { plans: PLANS, groups: GROUPS, eventTypeLabel, drawer: drawerState() },
    async play() {
        await expect(await waitForOpen('dialog')).toBeVisible();
    },
} satisfies Meta<typeof ExtensionDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

// New extension: months, price and the plans by event type, nothing picked yet.
export const New: Story = {};

// New extension on two plans, ready to save. Classic already sells 6 months,
// so it can't be ticked; the two Classic plans differ by event type and code.
export const NewFilled: Story = {
    args: {
        drawer: drawerState({
            draft: { planTierIds: ['plan-premium', 'plan-baptism'], months: '6', price: '29' },
            sellingLength: new Set(['plan-classic']),
            canSave: true,
        }),
    },
};

// An extension on sale: plan and months fixed, price editable, Retire.
export const EditLive: Story = {
    args: { drawer: drawerState({ editing: LIVE, draft: { planTierIds: [LIVE.plan.id], months: '6', price: '29' } }) },
};

// A retired extension: Put back on sale.
export const EditRetired: Story = {
    args: { drawer: drawerState({ editing: RETIRED, draft: { planTierIds: [RETIRED.plan.id], months: '3', price: '15' } }) },
};
