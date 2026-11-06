import { describe, expect, it } from 'vitest';

import { billingPeriodOptions, planChangeSummary, planPatchFromFormData, planSaveWarnings } from '@/lib/adminPlanEditor';
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

describe('planPatchFromFormData clear flags', () => {
    const controls = { visibility: 'LIVE', isGiftable: true } as const;
    const saved = {
        storageBytes: 1024,
        maxMembers: 10,
        discountPercent: 20,
        discountStartsAt: '2026-01-01T00:00:00.000Z',
        discountEndsAt: '2026-02-01T00:00:00.000Z',
    };
    const filled = () => {
        const data = form();
        data.set('storageAmount', '1');
        data.set('storageUnit', 'GB');
        data.set('maxMembers', '10');
        data.set('discountPercent', '20');
        data.set('discountStartsAt', '2026-01-01T00:00');
        data.set('discountEndsAt', '2026-02-01T00:00');
        return data;
    };

    it.each([
        ['storageAmount', 'clearStorageBytes'],
        ['maxMembers', 'clearMaxMembers'],
        ['discountPercent', 'clearDiscountPercent'],
        ['discountStartsAt', 'clearDiscountStartsAt'],
        ['discountEndsAt', 'clearDiscountEndsAt'],
    ] as const)('emptying %s sends only %s', (input, flag) => {
        const data = filled();
        data.set(input, '');
        const patch = planPatchFromFormData(plan(saved), data, controls);
        const flags = Object.keys(patch).filter((key) => key.startsWith('clear'));
        expect(flags).toEqual([flag]);
    });

    it('sends no flag for a value that was already empty', () => {
        const patch = planPatchFromFormData(plan(), form(), controls);
        expect(Object.keys(patch).filter((key) => key.startsWith('clear'))).toEqual([]);
    });

    it('sends no limit flag for an ACCOUNT plan, which has no limit fields', () => {
        const before = plan({ ...saved, scope: 'ACCOUNT', eventTypeKey: null });
        const patch = planPatchFromFormData(before, form(), controls);
        expect(patch.clearStorageBytes).toBeUndefined();
        expect(patch.clearMaxMembers).toBeUndefined();
    });

    it('lists an emptied limit as unlimited', () => {
        const data = filled();
        data.set('maxMembers', '');
        const before = plan(saved);
        const changes = planChangeSummary(before, planPatchFromFormData(before, data, controls), t);
        expect(changes).toContainEqual({ label: 'fields.maxMembers', before: '10', after: 'unlimited' });
    });
});

describe('planChangeSummary fields that cannot be emptied', () => {
    const controls = { visibility: 'LIVE', isGiftable: true } as const;
    const labels = (before: PlanTierResponseDto, data: FormData) =>
        planChangeSummary(before, planPatchFromFormData(before, data, controls), t).map((change) => change.label);

    it('does not claim a blank currency cleared it', () => {
        expect(labels(plan({ priceCurrency: 'EUR' }), form())).not.toContain('fields.priceCurrency');
    });

    it('treats a currency of only spaces as no change', () => {
        const data = form();
        data.set('priceCurrency', '   ');
        expect(labels(plan({ priceCurrency: 'EUR' }), data)).not.toContain('fields.priceCurrency');
    });

    it('still lists a changed currency', () => {
        const data = form();
        data.set('priceCurrency', 'usd');
        const before = plan({ priceCurrency: 'EUR' });
        expect(planChangeSummary(before, planPatchFromFormData(before, data, controls), t)).toContainEqual({
            label: 'fields.priceCurrency',
            before: 'EUR',
            after: 'USD',
        });
    });

    it('does not claim a blank billing period cleared it', () => {
        expect(labels(plan({ billingPeriod: 'ONE_TIME' }), form())).not.toContain('fields.billingPeriod');
    });

    it('does not claim a blank ACCOUNT price cleared it', () => {
        const before = plan({ scope: 'ACCOUNT', eventTypeKey: null, priceAmountMinor: 1000, priceCurrency: 'EUR' });
        expect(labels(before, form())).not.toContain('fields.price');
    });
});

describe('billingPeriodOptions', () => {
    it('keeps a saved period the form no longer sells', () => {
        expect(billingPeriodOptions('MONTHLY')).toEqual(['ONE_TIME', 'MONTHLY']);
    });

    it.each([null, 'ONE_TIME'] as const)('lists the sold periods once for %s', (current) => {
        expect(billingPeriodOptions(current)).toEqual(['ONE_TIME']);
    });
});

describe('planSaveWarnings', () => {
    const now = new Date('2026-06-15T00:00:00Z');
    const past = '2026-01-01T00:00:00.000Z';
    const future = '2026-12-01T00:00:00.000Z';
    const promo = (overrides = {}) =>
        ({ id: 'o1', active: true, promoPriceAmountMinor: 500, ...overrides }) as PlanTierResponseDto['initialOptions'][number];
    const NO_END = 'plans.saveSummary.promoPricesNoEnd';
    const LIVE = 'plans.saveSummary.goesLiveOnSave';

    it('warns when emptying the end date leaves a promo price with no end', () => {
        const before = plan({ discountEndsAt: future, initialOptions: [promo()] });
        expect(planSaveWarnings(before, { clearDiscountEndsAt: true }, t, now)).toEqual([NO_END]);
    });

    it('warns when emptying the percent leaves a promo price with no end', () => {
        const before = plan({ discountPercent: 10, initialOptions: [promo()] });
        expect(planSaveWarnings(before, { clearDiscountPercent: true }, t, now)).toEqual([NO_END]);
    });

    it('does not warn about promo prices while an end date remains', () => {
        const before = plan({ discountPercent: 10, discountEndsAt: future, initialOptions: [promo()] });
        expect(planSaveWarnings(before, { clearDiscountPercent: true }, t, now)).toEqual([]);
    });

    it.each([
        ['no promo price', { promoPriceAmountMinor: null }],
        ['a retired duration', { active: false }],
    ])('does not warn about promo prices with %s', (_name, option) => {
        const before = plan({ discountEndsAt: future, initialOptions: [promo(option)] });
        expect(planSaveWarnings(before, { clearDiscountEndsAt: true }, t, now)).toEqual([]);
    });

    it('warns when emptying a past end date restarts the promotion', () => {
        const before = plan({ discountPercent: 10, discountEndsAt: past });
        expect(planSaveWarnings(before, { clearDiscountEndsAt: true }, t, now)).toEqual([LIVE]);
    });

    it('warns when emptying a future start date starts the promotion early', () => {
        const before = plan({ discountPercent: 10, discountStartsAt: future });
        expect(planSaveWarnings(before, { clearDiscountStartsAt: true }, t, now)).toEqual([LIVE]);
    });

    it('does not warn about going live when the promotion was already running', () => {
        const before = plan({ discountPercent: 10, discountStartsAt: past, discountEndsAt: future });
        expect(planSaveWarnings(before, { clearDiscountStartsAt: true }, t, now)).toEqual([]);
    });

    it('does not warn about going live with nothing to discount', () => {
        const before = plan({ discountEndsAt: past });
        expect(planSaveWarnings(before, { clearDiscountEndsAt: true }, t, now)).toEqual([]);
    });

    it('does not warn about going live when the percent is emptied in the same save', () => {
        const before = plan({ discountPercent: 10, discountEndsAt: past });
        expect(planSaveWarnings(before, { clearDiscountEndsAt: true, clearDiscountPercent: true }, t, now)).toEqual([]);
    });

    it('gives both warnings when an ended promotion with a promo price restarts for good', () => {
        const before = plan({ discountEndsAt: past, initialOptions: [promo()] });
        expect(planSaveWarnings(before, { clearDiscountEndsAt: true }, t, now)).toEqual([NO_END, LIVE]);
    });

    it('has no warnings when nothing is emptied', () => {
        const before = plan({ discountPercent: 10, initialOptions: [promo()] });
        expect(planSaveWarnings(before, { discountPercent: 15 }, t, now)).toEqual([]);
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
