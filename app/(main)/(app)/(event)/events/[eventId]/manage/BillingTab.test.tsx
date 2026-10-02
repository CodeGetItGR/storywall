import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import BillingTab from '@/app/(main)/(app)/(event)/events/[eventId]/manage/BillingTab';
import type { EventScheduleDto } from '@/lib/api/types';

const calls = vi.hoisted(() => ({ panel: [] as unknown[][], withdrawals: [] as unknown[][] }));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useEventBillingPanel', () => ({
    useEventBillingPanel: (...args: unknown[]) => {
        calls.panel.push(args);
        return {
            isLoading: false,
            hasError: false,
            data: { storageTrimDueAt: null, eventStatus: 'ACTIVE', addons: [] },
            insights: { orderCurrency: 'EUR' },
            derived: { canManageAddons: false },
            usage: null,
            upgradeTargets: [{ code: 'PREMIUM' }],
            currentPlan: null,
            platformModules: [],
            handleRetry: () => undefined,
            handleShowAllOrders: () => undefined,
        };
    },
}));
vi.mock('@/hooks/useBillingWithdrawals', () => ({
    useBillingWithdrawals: (...args: unknown[]) => {
        calls.withdrawals.push(args);
        return { purchaseBlocks: { upgradeBlocked: false }, withdrawableOrderIds: [], history: [] };
    },
}));
vi.mock('@/hooks/useOrderWithdrawalFlow', () => ({ useOrderWithdrawalFlow: () => ({ open: () => undefined }) }));
vi.mock('@/components/manage/billing/BillingUpgradeSection', () => ({ BillingUpgradeSection: () => <div>upgrade-section</div> }));
vi.mock('@/components/manage/billing/BillingExtensionSection', () => ({ BillingExtensionSection: () => <div>extension-section</div> }));
vi.mock('@/components/manage/billing/BillingAddonsSection', () => ({ BillingAddonsSection: () => <div>addons-section</div> }));
vi.mock('@/components/manage/billing/BillingPlanSummary', () => ({ BillingPlanSummary: () => <div>plan-summary</div> }));
vi.mock('@/components/manage/billing/BillingOrdersPanel', () => ({ BillingOrdersPanel: () => <div>orders-panel</div> }));
vi.mock('@/components/manage/billing/StorageTrimNotice', () => ({ StorageTrimNotice: () => null }));
vi.mock('@/components/manage/billing/WithdrawalHistory', () => ({ WithdrawalHistory: () => <div>withdrawal-history</div> }));
vi.mock('@/components/manage/billing/OrderWithdrawalModal', () => ({ OrderWithdrawalModal: () => <div>withdrawal-modal</div> }));
vi.mock('@/components/manage/ManageSkeletons', () => ({ BillingTabSkeleton: () => <div>skeleton</div> }));
vi.mock('@/components/manage/Section', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

afterEach(() => {
    cleanup();
    calls.panel.length = 0;
    calls.withdrawals.length = 0;
});

const schedule = {
    startAt: '2026-10-10T16:00:00Z',
    endAt: null,
    coverageEndsAt: null,
    projectedCoverage: null,
    timezone: 'Europe/Athens',
    rsvpDeadline: null,
} as EventScheduleDto;

describe('BillingTab', () => {
    it('offers every purchase by default', () => {
        render(<BillingTab eventId="e-1" schedule={schedule} canPurchase />);
        expect(screen.getByText('upgrade-section')).toBeTruthy();
        expect(screen.getByText('extension-section')).toBeTruthy();
        expect(screen.getByText('addons-section')).toBeTruthy();
    });

    it('in withdrawal-only mode keeps the plan, the payments and the withdrawal, and offers no purchase', () => {
        render(<BillingTab eventId="e-1" schedule={schedule} canPurchase withdrawalOnly />);
        expect(screen.queryByText('upgrade-section')).toBeNull();
        expect(screen.queryByText('extension-section')).toBeNull();
        expect(screen.queryByText('addons-section')).toBeNull();
        expect(screen.getByText('plan-summary')).toBeTruthy();
        expect(screen.getByText('orders-panel')).toBeTruthy();
        expect(screen.getByText('withdrawal-modal')).toBeTruthy();
        // No upgrade-options request (it would 4015), but withdrawals stay on.
        expect(calls.panel.at(-1)?.[1]).toEqual({ isDeleted: false, canPurchase: false });
        expect(calls.withdrawals.at(-1)?.[2]).toEqual({ canWithdraw: true, canSeeHistory: true });
    });
});
