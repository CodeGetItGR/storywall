import { describe, expect, it } from 'vitest';

import type { CoverageOptionResponseDto, MemberRoleCatalogDto, PlanTierResponseDto } from '@/lib/api/types';
import { resolveLandingCategoryPlans } from '@/lib/landingCategories';

function option(overrides: Partial<CoverageOptionResponseDto> = {}): CoverageOptionResponseDto {
    return { id: 'o1', kind: 'INITIAL', months: 3, priceAmountMinor: 7900, promoPriceAmountMinor: null, sortOrder: 0, active: true, ...overrides };
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
        const result = resolveLandingCategoryPlans(plans, ['SOCIAL_EVENT', 'REUNION'], {});
        expect(result.plans.map((p) => p.code)).toEqual(['social-a', 'reunion-a', 'reunion-b']);
        expect(result.driftedGroups).toEqual([]);
    });

    it('shows a shared plan once while its copies match', () => {
        const plans = [
            plan({ code: 'social-gold', eventTypeKey: 'SOCIAL_EVENT', sharedGroupKey: 'g1' }),
            plan({ code: 'reunion-gold', eventTypeKey: 'REUNION', sharedGroupKey: 'g1' }),
        ];
        const result = resolveLandingCategoryPlans(plans, ['SOCIAL_EVENT', 'REUNION'], {});
        expect(result.plans.map((p) => p.code)).toEqual(['social-gold']);
        expect(result.driftedGroups).toEqual([]);
    });

    it('keeps drifted copies apart and reports them', () => {
        const plans = [
            plan({ code: 'social-gold', eventTypeKey: 'SOCIAL_EVENT', sharedGroupKey: 'g1' }),
            plan({ code: 'reunion-gold', eventTypeKey: 'REUNION', sharedGroupKey: 'g1', initialOptions: [option({ priceAmountMinor: 8900 })] }),
        ];
        const result = resolveLandingCategoryPlans(plans, ['SOCIAL_EVENT', 'REUNION'], {});
        expect(result.plans.map((p) => p.code)).toEqual(['social-gold', 'reunion-gold']);
        expect(result.driftedGroups).toEqual([{ sharedGroupKey: 'g1', planCodes: ['social-gold', 'reunion-gold'], differingFields: ['price'] }]);
    });

    it.each<[string, Partial<PlanTierResponseDto>]>([
        ['currency', { priceCurrency: 'USD' }],
        ['durations', { initialOptions: [option({ months: 6 })] }],
        ['extensions', { extensionOptions: [option({ kind: 'EXTENSION', months: 1, priceAmountMinor: 1000 })] }],
        ['discount', { discountPercent: 10 }],
        ['discountLabel', { discountLabel: 'Early bird' }],
        ['name', { name: 'Gold Plus' }],
        ['storage', { storageBytes: 5_000_000_000 }],
        ['guests', { maxMembers: 150 }],
        ['modules', { moduleKeys: ['gallery', 'rsvp'] }],
        ['moduleConfigs', { moduleConfigs: { gallery: { qrUploadEnabled: false } } }],
    ])('treats a difference in %s as drift, and names it', (field, difference) => {
        const plans = [
            plan({ code: 'a', eventTypeKey: 'SOCIAL_EVENT', sharedGroupKey: 'g1' }),
            plan({ code: 'b', eventTypeKey: 'REUNION', sharedGroupKey: 'g1', ...difference }),
        ];
        const result = resolveLandingCategoryPlans(plans, ['SOCIAL_EVENT', 'REUNION'], {});
        expect(result.plans).toHaveLength(2);
        expect(result.driftedGroups).toEqual([{ sharedGroupKey: 'g1', planCodes: ['a', 'b'], differingFields: [field] }]);
    });

    it('names every field that differs, and compares prices only of durations both sell', () => {
        const plans = [
            plan({ code: 'a', eventTypeKey: 'SOCIAL_EVENT', sharedGroupKey: 'g1' }),
            plan({
                code: 'b',
                eventTypeKey: 'REUNION',
                sharedGroupKey: 'g1',
                name: 'Gold Plus',
                initialOptions: [option(), option({ id: 'o2', months: 12, priceAmountMinor: 12900 })],
            }),
        ];
        expect(resolveLandingCategoryPlans(plans, ['SOCIAL_EVENT', 'REUNION'], {}).driftedGroups[0].differingFields).toEqual(['durations', 'name']);
    });

    it('treats a different active member-role count as drift, but only on plans with member roles', () => {
        const role = (retired = false) => ({ retired }) as MemberRoleCatalogDto;
        const memberRoles = { SOCIAL_EVENT: [role(), role()], REUNION: [role(), role(true)], BIRTHDAY: [role(), role()] };
        const withRoles = { moduleKeys: ['gallery', 'member_roles'], moduleConfigs: { gallery: { qrUploadEnabled: true }, member_roles: {} } };
        const plans = [
            plan({ code: 'a', eventTypeKey: 'SOCIAL_EVENT', sharedGroupKey: 'g1', ...withRoles }),
            plan({ code: 'b', eventTypeKey: 'REUNION', sharedGroupKey: 'g1', ...withRoles }),
            plan({ code: 'c', eventTypeKey: 'BIRTHDAY', sharedGroupKey: 'g1', ...withRoles }),
        ];
        const result = resolveLandingCategoryPlans(plans, ['SOCIAL_EVENT', 'REUNION', 'BIRTHDAY'], memberRoles);
        expect(result.plans.map((p) => p.code)).toEqual(['a', 'b']);
        expect(result.driftedGroups).toEqual([{ sharedGroupKey: 'g1', planCodes: ['a', 'b'], differingFields: ['memberRoles'] }]);

        const withoutRoles = [
            plan({ code: 'a', eventTypeKey: 'SOCIAL_EVENT', sharedGroupKey: 'g1' }),
            plan({ code: 'b', eventTypeKey: 'REUNION', sharedGroupKey: 'g1' }),
        ];
        expect(resolveLandingCategoryPlans(withoutRoles, ['SOCIAL_EVENT', 'REUNION'], memberRoles).plans.map((p) => p.code)).toEqual(['a']);
    });

    it('leaves out plans with nothing on sale, before merging', () => {
        const plans = [
            plan({ code: 'inactive', eventTypeKey: 'SOCIAL_EVENT', sharedGroupKey: 'g1', initialOptions: [option({ active: false })] }),
            plan({ code: 'no-currency', eventTypeKey: 'SOCIAL_EVENT', priceCurrency: null, sortOrder: 1 }),
            plan({ code: 'on-sale', eventTypeKey: 'REUNION', sharedGroupKey: 'g1', initialOptions: [option({ priceAmountMinor: 8900 })] }),
        ];
        const result = resolveLandingCategoryPlans(plans, ['SOCIAL_EVENT', 'REUNION'], {});
        expect(result.plans.map((p) => p.code)).toEqual(['on-sale']);
        expect(result.driftedGroups).toEqual([]);
    });

    it('reports drift only between copies on sale', () => {
        const plans = [
            plan({ code: 'a', eventTypeKey: 'SOCIAL_EVENT', sharedGroupKey: 'g1' }),
            plan({ code: 'b', eventTypeKey: 'REUNION', sharedGroupKey: 'g1', priceCurrency: 'USD', initialOptions: [option({ active: false })] }),
            plan({ code: 'c', eventTypeKey: 'BIRTHDAY', sharedGroupKey: 'g1', name: 'Gold Plus' }),
        ];
        expect(resolveLandingCategoryPlans(plans, ['SOCIAL_EVENT', 'REUNION', 'BIRTHDAY'], {}).driftedGroups).toEqual([
            { sharedGroupKey: 'g1', planCodes: ['a', 'c'], differingFields: ['name'] },
        ]);
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
        expect(resolveLandingCategoryPlans(plans, ['SOCIAL_EVENT', 'REUNION'], {}).plans.map((p) => p.code)).toEqual(['a']);
    });

    it('leaves out private, unassignable and account plans', () => {
        const plans = [
            plan({ code: 'private', isPublic: false }),
            plan({ code: 'closed', isAssignable: false }),
            plan({ code: 'account', scope: 'ACCOUNT', eventTypeKey: null }),
            plan({ code: 'ok' }),
        ];
        expect(resolveLandingCategoryPlans(plans, ['WEDDING'], {}).plans.map((p) => p.code)).toEqual(['ok']);
    });

    it('returns nothing for a category without types', () => {
        expect(resolveLandingCategoryPlans([plan({ code: 'ok' })], [], {})).toEqual({ plans: [], driftedGroups: [] });
    });
});
