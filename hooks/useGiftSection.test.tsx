import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useGiftSection } from '@/hooks/useGiftSection';
import type { EventModuleResponseDto, PlanTierResponseDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({
    gift: { data: null as unknown, isLoading: false },
    billing: { data: { planTierCode: 'GOLD' } as unknown, isLoading: false },
    billingEnabled: [] as boolean[],
}));

vi.mock('@/hooks/useGift', () => ({ useEventGift: () => mocks.gift }));
vi.mock('@/hooks/useBilling', () => ({
    useEventBilling: (_eventId: string | null, enabled: boolean) => {
        mocks.billingEnabled.push(enabled);
        return mocks.billing;
    },
}));

const coHosts = [{ moduleKey: 'co_hosts', isAvailable: true }] as EventModuleResponseDto[];
const plans = [{ scope: 'EVENT', code: 'GOLD', isGiftable: true, moduleKeys: ['co_hosts'] }] as PlanTierResponseDto[];

describe('useGiftSection', () => {
    beforeEach(() => {
        mocks.gift = { data: null, isLoading: false };
        mocks.billing = { data: { planTierCode: 'GOLD' }, isLoading: false };
        mocks.billingEnabled = [];
    });

    it('offers gifting to the primary host on a giftable plan', () => {
        const { result } = renderHook(() => useGiftSection('event-1', { isPrimaryHost: true, eventModules: coHosts, planTiers: plans }));
        expect(result.current.available).toBe(true);
    });

    it('hides it on a plan that cannot be given', () => {
        const planTiers = [{ ...plans[0], isGiftable: false }];
        const { result } = renderHook(() => useGiftSection('event-1', { isPrimaryHost: true, eventModules: coHosts, planTiers }));
        expect(result.current.available).toBe(false);
    });

    it('skips billing for a co-host and shows an existing gift', () => {
        mocks.gift = { data: { status: 'CLAIMED' }, isLoading: false };
        const { result } = renderHook(() => useGiftSection('event-1', { isPrimaryHost: false, eventModules: coHosts, planTiers: plans }));

        expect(result.current.available).toBe(true);
        expect(mocks.billingEnabled.every((enabled) => !enabled)).toBe(true);
    });

    it('hides it from a co-host when there is no gift', () => {
        const { result } = renderHook(() => useGiftSection('event-1', { isPrimaryHost: false, eventModules: coHosts, planTiers: plans }));
        expect(result.current.available).toBe(false);
    });
});
