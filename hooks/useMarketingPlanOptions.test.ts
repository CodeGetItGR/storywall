import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useMarketingPlanOptions } from '@/hooks/useMarketingPlanOptions';
import type { AppMediaConfigDto, PlanTierResponseDto } from '@/lib/api/types';

vi.mock('@/hooks/useAppConfig', () => ({ useMemberRoleCatalog: () => ({}) }));
vi.mock('@/hooks/usePlanMarketingCopy', () => {
    const copy = {
        everythingIn: (plan: string) => `Everything in ${plan}`,
        guestsUpTo: (count: number) => `Up to ${count} guests`,
        guestsUnlimited: 'Unlimited guests',
        moduleWithDetail: (label: string, detail: string) => `${label} · ${detail}`,
    };
    const moduleName = (key: string) => key;
    return { usePlanMarketingCopy: () => ({ copy, moduleName }) };
});

function plan(code: string, moduleKeys: string[], amountMinor: number, sortOrder: number): PlanTierResponseDto {
    return {
        id: code,
        code,
        scope: 'EVENT',
        name: code,
        sortOrder,
        isAssignable: true,
        isPublic: true,
        storageBytes: 1024,
        maxMembers: 100,
        priceCurrency: 'EUR',
        moduleKeys,
        paidModules: [],
        moduleConfigs: null,
        eventTypeKey: 'WEDDING',
        initialOptions: [
            { id: `${code}-o`, kind: 'INITIAL', months: 3, priceAmountMinor: amountMinor, promoPriceAmountMinor: null, sortOrder: 0, active: true },
        ],
        extensionOptions: [],
    } as unknown as PlanTierResponseDto;
}

const MEDIA = { estimateAvgImageBytes: 4 * 1024 * 1024, estimateAvgVideoBytes: 90 * 1024 * 1024, estimateImageRatio: 0.7 } as AppMediaConfigDto;
const PLANS = [
    plan('QR', ['gallery'], 4900, 0),
    plan('BUNDLE', ['gallery', 'wishbook'], 6900, 1),
    plan('START', ['gallery', 'posts'], 7900, 2),
    plan('STORY', ['gallery', 'posts', 'rsvp'], 9900, 3),
];

describe('useMarketingPlanOptions', () => {
    it('splits full and lite plans into their own rows and prices the teaser from the cheapest lite plan', () => {
        const { result } = renderHook(() => useMarketingPlanOptions({ plans: PLANS, modules: [], media: MEDIA }));

        expect(result.current.full.map((option) => option.config.code)).toEqual(['START', 'STORY']);
        expect(result.current.full.map((option) => option.featured)).toEqual([false, true]);
        expect(result.current.lite.map((option) => option.config.code)).toEqual(['QR', 'BUNDLE']);
        expect(result.current.lite.some((option) => option.featured)).toBe(false);
        expect(result.current.liteFromPrice).toBe('49€');
    });

    it('shows lite plans as the whole picker when there are no full plans', () => {
        const { result } = renderHook(() => useMarketingPlanOptions({ plans: PLANS.slice(0, 2), modules: [], media: MEDIA }));

        expect(result.current.full.map((option) => option.config.code)).toEqual(['QR', 'BUNDLE']);
        expect(result.current.lite).toEqual([]);
        expect(result.current.liteFromPrice).toBeNull();
    });

    it('returns nothing before the media config loads', () => {
        const { result } = renderHook(() => useMarketingPlanOptions({ plans: PLANS, modules: [], media: null }));

        expect(result.current).toEqual({ full: [], lite: [], liteFromPrice: null });
    });
});
