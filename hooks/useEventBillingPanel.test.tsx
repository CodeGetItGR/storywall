import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useEventBillingPanel } from '@/hooks/useEventBillingPanel';
import type { EventBillingResponseDto, UpgradeOptionResponseDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({
    useAppConfig: vi.fn(),
    useEventBilling: vi.fn(),
    useUpgradeOptions: vi.fn(),
}));

vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: mocks.useAppConfig }));
vi.mock('@/hooks/useBilling', () => ({
    useEventBilling: mocks.useEventBilling,
    useUpgradeOptions: mocks.useUpgradeOptions,
}));

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
    });

    it('uses the server-provided eligible target even when the global catalog cannot resolve it', () => {
        const { result } = renderHook(() => useEventBillingPanel('event-1'));

        expect(result.current.currentPlan).toBeNull();
        expect(result.current.nextUpgradeOption).toEqual(upgradeOption);
        expect(result.current.derived?.upgradeAmount).toBe(8_000);
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
        expect(result.current.nextUpgradeOption).toBeNull();
        expect(result.current.paidAddonOffers).toEqual([]);
    });
});
