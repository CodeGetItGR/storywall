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

// The server reads a null in this patch as "leave it", so clearing has to send an empty string.
describe('planPatchFromFormData clearing optional text', () => {
    const controls = { visibility: 'LIVE', isGiftable: true } as const;

    it.each(['description', 'discountLabel'] as const)('sends an empty string when %s is cleared', (field) => {
        const patch = planPatchFromFormData(plan({ [field]: 'Old text' }), form(), controls);
        expect(patch[field]).toBe('');
    });

    it.each(['description', 'discountLabel'] as const)('treats a %s of only spaces as cleared', (field) => {
        const data = form();
        data.set(field, '   ');
        expect(planPatchFromFormData(plan({ [field]: 'Old text' }), data, controls)[field]).toBe('');
    });

    it.each(['description', 'discountLabel'] as const)('leaves an empty %s as null', (field) => {
        expect(planPatchFromFormData(plan({ [field]: null }), form(), controls)[field]).toBeNull();
    });

    it.each(['description', 'discountLabel'] as const)('sends the trimmed text when %s has a value', (field) => {
        const data = form();
        data.set(field, ' New text ');
        expect(planPatchFromFormData(plan({ [field]: 'Old text' }), data, controls)[field]).toBe('New text');
    });

    it('lists a cleared description in the confirmation', () => {
        const before = plan({ description: 'Old text' });
        const patch = planPatchFromFormData(before, form(), controls);
        expect(planChangeSummary(before, patch, t)).toContainEqual({ label: 'fields.description', before: 'Old text', after: 'none' });
    });

    it('lists nothing for a description that was already blank', () => {
        const before = plan({ description: '' });
        const patch = planPatchFromFormData(before, form(), controls);
        expect(planChangeSummary(before, patch, t).map((change) => change.label)).not.toContain('fields.description');
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
