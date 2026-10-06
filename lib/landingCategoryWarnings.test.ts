import { describe, expect, it } from 'vitest';

import type { AdminLandingCategoryDto, AppEventTypeResponseDto, PlanTierResponseDto } from '@/lib/api/types';
import { landingCategoryWarnings } from '@/lib/landingCategoryWarnings';

function category(eventTypeKeys: AdminLandingCategoryDto['eventTypeKeys']): AdminLandingCategoryDto {
    return { id: 'c', name: { en: 'C' }, description: {}, sortOrder: 0, isVisible: true, isDefault: false, eventTypeKeys };
}

// /api/config.eventTypes lists enabled types only.
function enabled(keys: AppEventTypeResponseDto['eventTypeKey'][]): AppEventTypeResponseDto[] {
    return keys.map((eventTypeKey, sortOrder) => ({ id: eventTypeKey, eventTypeKey, icon: 'x', accentToken: 'rose', isEnabled: true, sortOrder }));
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
        moduleKeys: [],
        paidModules: [],
        moduleConfigs: {},
        eventTypeKey: 'SOCIAL_EVENT',
        sharedGroupKey: null,
        initialOptions: [{ id: 'o', kind: 'INITIAL', months: 3, priceAmountMinor: 100, sortOrder: 0, active: true }],
        extensionOptions: [],
        ...overrides,
    };
}

describe('landingCategoryWarnings', () => {
    it('flags a category with no enabled type', () => {
        expect(landingCategoryWarnings(category(['REUNION']), [], enabled(['SOCIAL_EVENT']))).toEqual({
            noEnabledType: true,
            noVisiblePlan: true,
            driftedGroups: [],
        });
    });

    it('flags a category whose enabled types have no public plan', () => {
        const hidden = plan({ isPublic: false });
        expect(landingCategoryWarnings(category(['SOCIAL_EVENT']), [hidden], enabled(['SOCIAL_EVENT']))).toEqual({
            noEnabledType: false,
            noVisiblePlan: true,
            driftedGroups: [],
        });
    });

    it('ignores plans of a type that is in the category but disabled', () => {
        const plans = [plan({ code: 'r', eventTypeKey: 'REUNION' })];
        expect(landingCategoryWarnings(category(['SOCIAL_EVENT', 'REUNION']), plans, enabled(['SOCIAL_EVENT'])).noVisiblePlan).toBe(true);
    });

    it('has nothing to say about a category with a public plan', () => {
        expect(landingCategoryWarnings(category(['SOCIAL_EVENT']), [plan({})], enabled(['SOCIAL_EVENT']))).toEqual({
            noEnabledType: false,
            noVisiblePlan: false,
            driftedGroups: [],
        });
    });

    it('reports drifted shared plans, through the same builder as the landing', () => {
        const plans = [
            plan({ code: 'a', sharedGroupKey: 'g' }),
            plan({ code: 'b', eventTypeKey: 'REUNION', sharedGroupKey: 'g', priceCurrency: 'USD' }),
        ];
        expect(landingCategoryWarnings(category(['SOCIAL_EVENT', 'REUNION']), plans, enabled(['SOCIAL_EVENT', 'REUNION'])).driftedGroups).toEqual([
            { sharedGroupKey: 'g', planCodes: ['a', 'b'] },
        ]);
    });
});
