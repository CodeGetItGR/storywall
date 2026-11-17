import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useEventOverviewPlan } from '@/hooks/useEventOverviewPlan';
import type { EventUsageResponseDto, PlanTierResponseDto } from '@/lib/api/types';

vi.mock('@/hooks/useBilling', () => ({
    useEventBilling: () => ({ data: { coverageOptionId: 'o1', addons: [] }, isLoading: false }),
}));

const plans = [
    {
        id: 'p1',
        code: 'START',
        scope: 'EVENT',
        isAssignable: true,
        isPublic: true,
        moduleKeys: [],
        priceCurrency: 'EUR',
        discountPercent: null,
        campaignDiscountPercent: 20,
        campaignDiscountStartsAt: '2026-11-03T10:00:30Z',
        campaignDiscountEndsAt: '2026-11-03T11:00:00Z',
        initialOptions: [{ id: 'o1', kind: 'INITIAL', months: 3, priceAmountMinor: 10_000, promoPriceAmountMinor: null, sortOrder: 0, active: true }],
        extensionOptions: [],
    },
] as unknown as PlanTierResponseDto[];

describe('useEventOverviewPlan', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('works out the draft total again when a campaign starts and ends', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-11-03T10:00:00Z'));
        const eventUsage = { planTier: 'START' } as EventUsageResponseDto;
        const { result } = renderHook(() =>
            useEventOverviewPlan({
                eventId: 'e1',
                eventStatus: 'DRAFT',
                eventUsage,
                planTiers: plans,
                paidServices: [],
                modules: [],
                eventModules: [],
            }),
        );
        expect(result.current.activationTotal).toBe(10_000);

        act(() => {
            vi.advanceTimersByTime(30_000);
        });
        expect(result.current.activationTotal).toBe(8_000);

        act(() => {
            vi.advanceTimersByTime(60 * 60 * 1000);
        });
        expect(result.current.activationTotal).toBe(10_000);
    });
});
