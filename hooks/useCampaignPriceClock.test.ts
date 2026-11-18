import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCampaignPriceClock } from '@/hooks/useCampaignPriceClock';
import type { PlanTierResponseDto } from '@/lib/api/types';

const START = new Date('2026-11-03T10:00:00Z');

const plan = (startsAt: string, endsAt: string) =>
    ({ campaignDiscountPercent: 20, campaignDiscountStartsAt: startsAt, campaignDiscountEndsAt: endsAt }) as PlanTierResponseDto;

describe('useCampaignPriceClock', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(START);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('ticks at the campaign start and again at its end', () => {
        const plans = [plan('2026-11-03T10:00:10Z', '2026-11-03T10:01:00Z')];
        const { result } = renderHook(() => useCampaignPriceClock(plans));
        expect(result.current).toBe(plans);

        act(() => {
            vi.advanceTimersByTime(9_999);
        });
        expect(result.current).toBe(plans);

        act(() => {
            vi.advanceTimersByTime(1);
        });
        const atStart = result.current;
        expect(atStart).not.toBe(plans);
        expect(atStart).toEqual(plans);

        act(() => {
            vi.advanceTimersByTime(50_000);
        });
        const atEnd = result.current;
        expect(atEnd).not.toBe(atStart);
        expect(atEnd).toEqual(plans);

        act(() => {
            vi.advanceTimersByTime(24 * 60 * 60 * 1000);
        });
        expect(result.current).toBe(atEnd);
        expect(vi.getTimerCount()).toBe(0);
    });

    it('sets no timer without a campaign, and clears it on unmount', () => {
        const none = renderHook(() => useCampaignPriceClock([]));
        expect(vi.getTimerCount()).toBe(0);
        none.unmount();

        const plans = [plan('2026-11-03T10:00:10Z', '2026-11-03T10:01:00Z')];
        const { unmount } = renderHook(() => useCampaignPriceClock(plans));
        expect(vi.getTimerCount()).toBe(1);
        unmount();
        expect(vi.getTimerCount()).toBe(0);
    });

    it('waits in steps for a boundary further away than a timer can count', () => {
        const plans = [plan('2026-12-31T00:00:00Z', '2027-01-31T00:00:00Z')];
        const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
        const { result } = renderHook(() => useCampaignPriceClock(plans));

        act(() => {
            vi.advanceTimersByTime(2_147_483_647);
        });

        expect(result.current).not.toBe(plans);
        expect(setTimeoutSpy.mock.calls.some(([, delay]) => delay === 2_147_483_647)).toBe(true);
        expect(setTimeoutSpy.mock.calls.every(([, delay]) => (delay as number) <= 2_147_483_647)).toBe(true);
    });

    it('hands back refetched plans at once', () => {
        const first = [plan('2026-11-03T10:00:10Z', '2026-11-03T10:01:00Z')];
        const second = [plan('2026-11-03T10:00:10Z', '2026-11-03T10:01:00Z')];
        const { result, rerender } = renderHook(({ plans }) => useCampaignPriceClock(plans), { initialProps: { plans: first } });

        act(() => {
            vi.advanceTimersByTime(10_000);
        });
        expect(result.current).not.toBe(first);

        rerender({ plans: second });
        expect(result.current).toBe(second);
    });

    it('works without plans', () => {
        const { result } = renderHook(() => useCampaignPriceClock(undefined));
        expect(result.current).toBeUndefined();
    });
});
