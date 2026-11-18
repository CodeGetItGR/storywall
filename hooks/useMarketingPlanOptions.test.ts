import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useMarketingPlanOptions } from '@/hooks/useMarketingPlanOptions';
import { planRequirementsOf } from '@/lib/__fixtures__/planRequirements';
import type { AppMediaConfigDto, PlanTierResponseDto } from '@/lib/api/types';

vi.mock('next-intl', () => ({ useLocale: () => 'en' }));
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
        requirements: planRequirementsOf(moduleKeys),
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
    it('splits full and lite plans into their own rows', () => {
        const { result } = renderHook(() => useMarketingPlanOptions({ plans: PLANS, modules: [], media: MEDIA }));

        expect(result.current.full.map((option) => option.config.code)).toEqual(['START', 'STORY']);
        expect(result.current.full.map((option) => option.featured)).toEqual([false, true]);
        expect(result.current.lite.map((option) => option.config.code)).toEqual(['QR', 'BUNDLE']);
        expect(result.current.lite.some((option) => option.featured)).toBe(false);
    });

    it('shows lite plans as the whole picker when there are no full plans', () => {
        const { result } = renderHook(() => useMarketingPlanOptions({ plans: PLANS.slice(0, 2), modules: [], media: MEDIA }));

        expect(result.current.full.map((option) => option.config.code)).toEqual(['QR', 'BUNDLE']);
        expect(result.current.lite).toEqual([]);
    });

    it('returns nothing before the media config loads', () => {
        const { result } = renderHook(() => useMarketingPlanOptions({ plans: PLANS, modules: [], media: null }));

        expect(result.current).toEqual({ full: [], lite: [] });
    });

    describe('campaign prices', () => {
        afterEach(() => {
            vi.useRealTimers();
        });

        it('switches a card to the campaign price at its start and back at its end', () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-11-03T10:00:00Z'));
            const campaign = {
                campaignDiscountPercent: 20,
                campaignDiscountStartsAt: '2026-11-03T10:00:30Z',
                campaignDiscountEndsAt: '2026-11-03T11:00:00Z',
            };
            const plans = [{ ...plan('START', ['gallery', 'posts'], 10_000, 0), ...campaign }];
            const { result } = renderHook(() => useMarketingPlanOptions({ plans, modules: [], media: MEDIA }));
            const price = () => result.current.full[0].presentation.durations[0].price;
            expect(price()).toBe('100€');

            act(() => {
                vi.advanceTimersByTime(30_000);
            });
            expect(price()).toBe('80€');

            act(() => {
                vi.advanceTimersByTime(60 * 60 * 1000);
            });
            expect(price()).toBe('100€');
        });
    });
});
