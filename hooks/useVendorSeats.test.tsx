import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useVendorSeats } from '@/hooks/useVendorSeats';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
}));
const state = vi.hoisted(() => ({
    modules: [] as unknown[],
    isPrimaryHost: true,
    upgradeOptions: [] as unknown[],
    upgradeEnabled: [] as boolean[],
    planTiers: [] as unknown[],
}));
vi.mock('@/providers/EventProvider', () => ({ useActiveEvent: () => ({ id: 'e1', modules: state.modules }) }));
vi.mock('@/hooks/useIsPrimaryHost', () => ({ useIsPrimaryHost: () => state.isPrimaryHost }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: { planTiers: state.planTiers } }) }));
vi.mock('@/hooks/useBilling', () => ({
    useUpgradeOptions: (_eventId: string, enabled: boolean) => {
        state.upgradeEnabled.push(enabled);
        return { data: enabled ? state.upgradeOptions : undefined };
    },
}));
vi.mock('@/lib/planTiers', () => ({
    findPlanByCode: (plans: { code: string }[], _scope: string, code: string) => plans.find((plan) => plan.code === code),
}));

const vendorsModule = (maxVendors?: number) => ({
    moduleKey: 'vendors',
    configuration: maxVendors === undefined ? {} : { maxVendors },
});
const PREMIUM = { code: 'PREMIUM', name: 'Premium', moduleKeys: ['vendors'], moduleConfigs: { vendors: { maxVendors: 10 } } };

beforeEach(() => {
    state.modules = [vendorsModule(5)];
    state.isPrimaryHost = true;
    state.upgradeOptions = [{ planTierCode: 'PREMIUM' }];
    state.upgradeEnabled = [];
    state.planTiers = [PREMIUM];
});

describe('useVendorSeats', () => {
    it('counts the joined vendors against the event cap and asks for no upgrade below it', () => {
        const { result } = renderHook(() => useVendorSeats('e1', 2));
        expect(result.current.seatsLabel).toBe('seats:{"used":2,"max":5}');
        expect(result.current.isFull).toBe(false);
        expect(result.current.fullNotice).toBeNull();
        expect(state.upgradeEnabled.every((enabled) => !enabled)).toBe(true);
    });

    it('names the next plan and its seats once full', () => {
        const { result } = renderHook(() => useVendorSeats('e1', 5));
        expect(result.current.isFull).toBe(true);
        expect(result.current.fullNotice).toBe('fullWithUpgrade:{"plan":"Premium","count":10}');
    });

    it('says plainly that it is full when the next plan has no more seats or no vendors', () => {
        state.planTiers = [{ ...PREMIUM, moduleConfigs: { vendors: { maxVendors: 5 } } }];
        expect(renderHook(() => useVendorSeats('e1', 5)).result.current.fullNotice).toBe('full');
        state.planTiers = [{ ...PREMIUM, moduleKeys: [] }];
        expect(renderHook(() => useVendorSeats('e1', 5)).result.current.fullNotice).toBe('full');
    });

    it('skips the upgrade hint for a co-host, who cannot buy', () => {
        state.isPrimaryHost = false;
        const { result } = renderHook(() => useVendorSeats('e1', 5));
        expect(result.current.fullNotice).toBe('full');
        expect(state.upgradeEnabled.every((enabled) => !enabled)).toBe(true);
    });

    it('shows no count without a cap', () => {
        state.modules = [vendorsModule()];
        const { result } = renderHook(() => useVendorSeats('e1', 3));
        expect(result.current.seatsLabel).toBeNull();
        expect(result.current.isFull).toBe(false);
    });
});
