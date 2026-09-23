import { describe, expect, it } from 'vitest';

import type { PlanTierResponseDto } from '@/lib/api/types';
import { buildPlanUpgradeDiff } from '@/lib/planUpgradeDiff';

function makePlan(overrides: Partial<PlanTierResponseDto> = {}): PlanTierResponseDto {
    return {
        id: 'plan',
        code: 'PLAN',
        scope: 'EVENT',
        name: 'Plan',
        description: null,
        sortOrder: 0,
        isDefault: false,
        isAssignable: true,
        isPublic: true,
        storageBytes: 10_000,
        maxMembers: 100,
        autoDeleteMonths: 3,
        priceAmountMinor: 5_000,
        priceCurrency: 'EUR',
        billingPeriod: 'ONE_TIME',
        discountPercent: null,
        discountLabel: null,
        discountStartsAt: null,
        discountEndsAt: null,
        moduleKeys: ['gallery'],
        paidModules: [],
        eventTypeKey: 'WEDDING',
        sharedGroupKey: null,
        ...overrides,
    };
}

describe('buildPlanUpgradeDiff', () => {
    it('returns only changed limits and module additions', () => {
        const diff = buildPlanUpgradeDiff(
            makePlan(),
            makePlan({ storageBytes: 50_000, maxMembers: 500, moduleKeys: ['gallery', 'rsvp'], autoDeleteMonths: 3 }),
        );

        expect(diff.limitChanges).toEqual([
            { key: 'storage', current: 10_000, target: 50_000 },
            { key: 'members', current: 100, target: 500 },
        ]);
        expect(diff.addedModuleKeys).toEqual(['rsvp']);
        expect(diff.removedModuleKeys).toEqual([]);
    });

    it('never lists a coverage term change, since an upgrade does not move coverage', () => {
        const diff = buildPlanUpgradeDiff(makePlan(), makePlan({ autoDeleteMonths: 12 }));

        expect(diff.limitChanges).toEqual([]);
    });

    it('reports unlimited limits and removed modules accurately', () => {
        const diff = buildPlanUpgradeDiff(makePlan({ moduleKeys: ['gallery', 'stories'] }), makePlan({ maxMembers: null }));

        expect(diff.limitChanges).toContainEqual({ key: 'members', current: 100, target: null });
        expect(diff.removedModuleKeys).toEqual(['stories']);
    });
});
