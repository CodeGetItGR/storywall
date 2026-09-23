import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useEventBillingPanel } from '@/hooks/useEventBillingPanel';
import type { EventBillingResponseDto, UpgradeOptionResponseDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({
    useAppConfig: vi.fn(),
    useEventBilling: vi.fn(),
    useUpgradeOptions: vi.fn(),
    useEventUsage: vi.fn(),
}));

vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: mocks.useAppConfig }));
vi.mock('@/hooks/useBilling', () => ({
    useEventBilling: mocks.useEventBilling,
    useUpgradeOptions: mocks.useUpgradeOptions,
}));
vi.mock('@/hooks/useUsage', () => ({ useEventUsage: mocks.useEventUsage }));

const billingData: EventBillingResponseDto = {
    eventStatus: 'ACTIVE',
    planTierCode: 'WEDDING_SIGNATURE',
    planTierName: 'SIGNATURE',
    orders: [],
    addons: [],
};

const upgradeOption: UpgradeOptionResponseDto = {
    planTierCode: 'WEDDING_PREMIUM',
    planTierName: 'PREMIUM',
    currency: 'EUR',
    gapAmountMinor: 10_000,
    payableAmountMinor: 8_000,
};

function queryResult<T>(data: T, overrides: Record<string, unknown> = {}) {
    return {
        data,
        error: null,
        isLoading: false,
        refetch: vi.fn(),
        ...overrides,
    };
}

describe('useEventBillingPanel', () => {
    beforeEach(() => {
        mocks.useAppConfig.mockReturnValue(queryResult({ planTiers: [], paidServices: [] }));
        mocks.useEventBilling.mockReturnValue(queryResult(billingData));
        mocks.useUpgradeOptions.mockReturnValue(queryResult([upgradeOption]));
        mocks.useEventUsage.mockReturnValue(queryResult(undefined));
    });

    it('uses the server-provided eligible target even when the global catalog cannot resolve it', () => {
        const { result } = renderHook(() => useEventBillingPanel('event-1'));

        expect(result.current.currentPlan).toBeNull();
        expect(result.current.upgradeTargets).toEqual([{ option: upgradeOption, plan: null }]);
        expect(result.current.hasError).toBe(false);
    });

    it('offers every upgrade target the server returns, not only the next tier', () => {
        const topOption: UpgradeOptionResponseDto = {
            ...upgradeOption,
            planTierCode: 'WEDDING_ELITE',
            planTierName: 'ELITE',
            payableAmountMinor: 20_000,
        };
        mocks.useUpgradeOptions.mockReturnValue(queryResult([upgradeOption, topOption]));

        const { result } = renderHook(() => useEventBillingPanel('event-1'));

        expect(result.current.upgradeTargets.map((target) => target.option.planTierCode)).toEqual(['WEDDING_PREMIUM', 'WEDDING_ELITE']);
    });

    it('keeps billing usable when usage fails, with no limits to show', () => {
        mocks.useEventUsage.mockReturnValue(queryResult(undefined, { error: new Error('failed') }));

        const { result } = renderHook(() => useEventBillingPanel('event-1'));

        expect(result.current.usage).toBeNull();
        expect(result.current.hasError).toBe(false);
    });

    it('keeps the billing screen loading until upgrade eligibility is known', () => {
        mocks.useUpgradeOptions.mockReturnValue(queryResult<UpgradeOptionResponseDto[] | undefined>(undefined, { isLoading: true }));

        const { result } = renderHook(() => useEventBillingPanel('event-1'));

        expect(result.current.isLoading).toBe(true);
    });

    it('surfaces an upgrade-options failure through the billing error state', () => {
        mocks.useUpgradeOptions.mockReturnValue(queryResult<UpgradeOptionResponseDto[] | undefined>(undefined, { error: new Error('failed') }));

        const { result } = renderHook(() => useEventBillingPanel('event-1'));

        expect(result.current.hasError).toBe(true);
    });

    it('never requests upgrade options or offers add-ons for a deleted event', () => {
        mocks.useAppConfig.mockReturnValue(queryResult({ planTiers: [], paidServices: [{ id: 'svc-1', planTierIds: [] }] }));
        mocks.useUpgradeOptions.mockReturnValue(queryResult<UpgradeOptionResponseDto[] | undefined>(undefined));

        const { result } = renderHook(() => useEventBillingPanel('event-1', { isDeleted: true }));

        expect(mocks.useUpgradeOptions).toHaveBeenCalledWith('event-1', false);
        expect(mocks.useEventUsage).toHaveBeenCalledWith(null);
        expect(result.current.upgradeTargets).toEqual([]);
        expect(result.current.paidAddonOffers).toEqual([]);
        expect(result.current.derived?.canManageAddons).toBe(false);
    });
});
