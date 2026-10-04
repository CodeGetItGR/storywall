import { describe, expect, it } from 'vitest';

import { planChangeSummary, planPatchFromFormData } from '@/lib/adminPlanEditor';
import type { PlanTierResponseDto } from '@/lib/api/types';

function plan(overrides: Partial<PlanTierResponseDto> = {}): PlanTierResponseDto {
    return {
        id: 'p1',
        code: 'P1',
        scope: 'EVENT',
        name: 'Basic',
        description: null,
        sortOrder: 0,
        isDefault: false,
        isAssignable: true,
        isPublic: true,
        isGiftable: true,
        storageBytes: null,
        maxMembers: null,
        priceAmountMinor: null,
        priceCurrency: null,
        billingPeriod: null,
        discountPercent: null,
        discountLabel: null,
        discountStartsAt: null,
        discountEndsAt: null,
        moduleKeys: [],
        paidModules: null,
        moduleConfigs: null,
        eventTypeKey: 'WEDDING',
        sharedGroupKey: null,
        initialOptions: [],
        extensionOptions: [],
        ...overrides,
    };
}

function form() {
    const data = new FormData();
    data.set('name', 'Basic');
    return data;
}

const t = (key: string) => key;

describe('planPatchFromFormData isGiftable', () => {
    it('sends the gift flag for an EVENT plan', () => {
        expect(planPatchFromFormData(plan(), form(), { visibility: 'LIVE', isGiftable: false }).isGiftable).toBe(false);
    });

    it('leaves it out for an ACCOUNT plan', () => {
        expect(
            planPatchFromFormData(plan({ scope: 'ACCOUNT', eventTypeKey: null }), form(), { visibility: 'LIVE', isGiftable: false }),
        ).not.toHaveProperty('isGiftable');
    });
});

describe('planChangeSummary isGiftable', () => {
    it('lists a changed gift flag', () => {
        const patch = planPatchFromFormData(plan(), form(), { visibility: 'LIVE', isGiftable: false });
        expect(planChangeSummary(plan(), patch, t)).toContainEqual({ label: 'fields.isGiftable', before: 'Enabled', after: 'Disabled' });
    });

    it('lists nothing when it is unchanged', () => {
        const patch = planPatchFromFormData(plan(), form(), { visibility: 'LIVE', isGiftable: true });
        expect(planChangeSummary(plan(), patch, t).map((change) => change.label)).not.toContain('fields.isGiftable');
    });
});
