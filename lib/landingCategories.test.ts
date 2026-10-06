import { describe, expect, it } from 'vitest';

import type { CoverageOptionResponseDto, PlanTierResponseDto } from '@/lib/api/types';
import { resolveLandingCategoryPlans } from '@/lib/landingCategories';

function option(overrides: Partial<CoverageOptionResponseDto> = {}): CoverageOptionResponseDto {
    return { id: 'o1', kind: 'INITIAL', months: 3, priceAmountMinor: 7900, sortOrder: 0, active: true, ...overrides };
}

function plan(overrides: Partial<PlanTierResponseDto>): PlanTierResponseDto {
    return {
        id: overrides.code ?? 'p',
        code: 'p',
        scope: 'EVENT',
        name: 'Plan',
        description: null,
        sortOrder: 0,
        isDefault: false,
        isAssignable: true,
        isPublic: true,
        isGiftable: false,
        storageBytes: null,
        maxMembers: null,
        priceAmountMinor: null,
        priceCurrency: 'EUR',
        billingPeriod: 'ONE_TIME',
        discountPercent: null,
        discountLabel: null,
        discountStartsAt: null,
        discountEndsAt: null,
        moduleKeys: ['gallery'],
        paidModules: [],
        moduleConfigs: { gallery: { qrUploadEnabled: true } },
        eventTypeKey: 'WEDDING',
        sharedGroupKey: null,
        initialOptions: [option()],
        extensionOptions: [],
        ...overrides,
    };
}

describe('resolveLandingCategoryPlans', () => {
    it('merges the types in category order, then plan order', () => {
        const plans = [
            plan({ code: 'reunion-b', eventTypeKey: 'REUNION', sortOrder: 1 }),
            plan({ code: 'social-a', eventTypeKey: 'SOCIAL_EVENT', sortOrder: 2 }),
            plan({ code: 'reunion-a', eventTypeKey: 'REUNION', sortOrder: 0 }),
            plan({ code: 'wedding', eventTypeKey: 'WEDDING' }),
        ];
        const result = resolveLandingCategoryPlans(plans, ['SOCIAL_EVENT', 'REUNION']);
        expect(result.plans.map((p) => p.code)).toEqual(['social-a', 'reunion-a', 'reunion-b']);
        expect(result.driftedGroups).toEqual([]);
    });

    it('shows a shared plan once while its copies match', () => {
        const plans = [
            plan({ code: 'social-gold', eventTypeKey: 'SOCIAL_EVENT', sharedGroupKey: 'g1' }),
            plan({ code: 'reunion-gold', eventTypeKey: 'REUNION', sharedGroupKey: 'g1' }),
        ];
        const result = resolveLandingCategoryPlans(plans, ['SOCIAL_EVENT', 'REUNION']);
        expect(result.plans.map((p) => p.code)).toEqual(['social-gold']);
        expect(result.driftedGroups).toEqual([]);
    });

    it('keeps drifted copies apart and reports them', () => {
        const plans = [
            plan({ code: 'social-gold', eventTypeKey: 'SOCIAL_EVENT', sharedGroupKey: 'g1' }),
            plan({ code: 'reunion-gold', eventTypeKey: 'REUNION', sharedGroupKey: 'g1', initialOptions: [option({ priceAmountMinor: 8900 })] }),
        ];
        const result = resolveLandingCategoryPlans(plans, ['SOCIAL_EVENT', 'REUNION']);
        expect(result.plans.map((p) => p.code)).toEqual(['social-gold', 'reunion-gold']);
        expect(result.driftedGroups).toEqual([{ sharedGroupKey: 'g1', planCodes: ['social-gold', 'reunion-gold'] }]);
    });

    it.each<[string, Partial<PlanTierResponseDto>]>([
        ['currency', { priceCurrency: 'USD' }],
        ['months', { initialOptions: [option({ months: 6 })] }],
        ['an extension option', { extensionOptions: [option({ kind: 'EXTENSION', months: 1, priceAmountMinor: 1000 })] }],
        ['the discount', { discountPercent: 10 }],
        ['modules', { moduleKeys: ['gallery', 'rsvp'] }],
        ['module config', { moduleConfigs: { gallery: { qrUploadEnabled: false } } }],
    ])('treats a difference in %s as drift', (_label, difference) => {
        const plans = [
            plan({ code: 'a', eventTypeKey: 'SOCIAL_EVENT', sharedGroupKey: 'g1' }),
            plan({ code: 'b', eventTypeKey: 'REUNION', sharedGroupKey: 'g1', ...difference }),
        ];
        expect(resolveLandingCategoryPlans(plans, ['SOCIAL_EVENT', 'REUNION']).plans).toHaveLength(2);
    });

    it('ignores inactive options and key order in module config', () => {
        const plans = [
            plan({ code: 'a', eventTypeKey: 'SOCIAL_EVENT', sharedGroupKey: 'g1', moduleConfigs: { gallery: { x: 1, y: 2 } } }),
            plan({
                code: 'b',
                eventTypeKey: 'REUNION',
                sharedGroupKey: 'g1',
                moduleConfigs: { gallery: { y: 2, x: 1 } },
                initialOptions: [option(), option({ id: 'o2', months: 12, active: false })],
            }),
        ];
        expect(resolveLandingCategoryPlans(plans, ['SOCIAL_EVENT', 'REUNION']).plans.map((p) => p.code)).toEqual(['a']);
    });

    it('leaves out private, unassignable and account plans', () => {
        const plans = [
            plan({ code: 'private', isPublic: false }),
            plan({ code: 'closed', isAssignable: false }),
            plan({ code: 'account', scope: 'ACCOUNT', eventTypeKey: null }),
            plan({ code: 'ok' }),
        ];
        expect(resolveLandingCategoryPlans(plans, ['WEDDING']).plans.map((p) => p.code)).toEqual(['ok']);
    });

    it('returns nothing for a category without types', () => {
        expect(resolveLandingCategoryPlans([plan({ code: 'ok' })], [])).toEqual({ plans: [], driftedGroups: [] });
    });
});
