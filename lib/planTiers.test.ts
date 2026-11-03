import { describe, expect, it } from 'vitest';

import { planRequirementsOf } from '@/lib/__fixtures__/planRequirements';
import type { CoverageOptionResponseDto, PlanTierResponseDto } from '@/lib/api/types';
import {
    defaultSelectedPlan,
    findNextPlan,
    getOptionPriceDetails,
    isLitePlan,
    liveInitialOptions,
    planAsksEventDetails,
    qrPagePlans,
    resolveInitialOption,
    shortestInitialOption,
    splitLitePlans,
} from '@/lib/planTiers';

describe('planAsksEventDetails', () => {
    it('reads the plan requirements, and asks until the plan is known', () => {
        expect(planAsksEventDetails({ requirements: planRequirementsOf(['gallery']) })).toBe(false);
        expect(planAsksEventDetails({ requirements: planRequirementsOf(['wishbook']) })).toBe(false);
        expect(planAsksEventDetails({ requirements: planRequirementsOf(['posts', 'gallery']) })).toBe(true);
        expect(planAsksEventDetails({ requirements: null })).toBe(true);
        expect(planAsksEventDetails(undefined)).toBe(true);
    });
});

function makeOption(overrides: Partial<CoverageOptionResponseDto> = {}): CoverageOptionResponseDto {
    return {
        id: 'opt-3',
        kind: 'INITIAL',
        months: 3,
        priceAmountMinor: 4_900,
        promoPriceAmountMinor: null,
        sortOrder: 0,
        active: true,
        ...overrides,
    };
}

function makePlan(overrides: Partial<PlanTierResponseDto> = {}): PlanTierResponseDto {
    return {
        id: 'wedding-start',
        code: 'WEDDING_START',
        scope: 'EVENT',
        name: 'START',
        description: null,
        sortOrder: 0,
        isDefault: true,
        isAssignable: true,
        isPublic: true,
        isGiftable: true,
        storageBytes: 1_000,
        maxMembers: 100,
        priceAmountMinor: 5_000,
        priceCurrency: 'EUR',
        billingPeriod: 'ONE_TIME',
        discountPercent: null,
        discountLabel: null,
        discountStartsAt: null,
        discountEndsAt: null,
        moduleKeys: [],
        paidModules: [],
        moduleConfigs: null,
        eventTypeKey: 'WEDDING',
        sharedGroupKey: null,
        initialOptions: [],
        extensionOptions: [],
        requirements: planRequirementsOf(overrides.moduleKeys ?? []),
        ...overrides,
    };
}

describe('findNextPlan', () => {
    function eventPlan(overrides: Partial<PlanTierResponseDto> = {}): PlanTierResponseDto {
        return makePlan({ priceAmountMinor: null, initialOptions: [makeOption()], ...overrides });
    }

    it('does not cross event types when catalog rows share a display name', () => {
        const plans = [
            eventPlan({ id: 'wedding-signature', code: 'WEDDING_SIGNATURE', name: 'SIGNATURE', sortOrder: 1 }),
            eventPlan({ id: 'social-signature', code: 'SOCIAL_SIGNATURE', name: 'SIGNATURE', eventTypeKey: 'SOCIAL_EVENT', sortOrder: 2 }),
            eventPlan({ id: 'wedding-premium', code: 'WEDDING_PREMIUM', name: 'PREMIUM', sortOrder: 3 }),
        ];

        expect(findNextPlan(plans, 'EVENT', 'WEDDING_SIGNATURE')?.code).toBe('WEDDING_PREMIUM');
    });

    it('takes the next event plan in catalog order, whatever its durations cost', () => {
        const plans = [
            eventPlan(),
            eventPlan({ id: 'cheaper-next', code: 'CHEAPER_NEXT', sortOrder: 1, initialOptions: [makeOption({ priceAmountMinor: 100 })] }),
            eventPlan({ id: 'top', code: 'TOP', sortOrder: 2 }),
        ];

        expect(findNextPlan(plans, 'EVENT', 'WEDDING_START')?.code).toBe('CHEAPER_NEXT');
    });

    it('skips event plans with no duration on sale', () => {
        const plans = [
            eventPlan(),
            eventPlan({ id: 'off-sale', code: 'OFF_SALE', sortOrder: 1, initialOptions: [] }),
            eventPlan({ id: 'retired', code: 'RETIRED', sortOrder: 2, initialOptions: [makeOption({ active: false })] }),
            eventPlan({ id: 'upgrade', code: 'UPGRADE', sortOrder: 3 }),
        ];

        expect(findNextPlan(plans, 'EVENT', 'WEDDING_START')?.code).toBe('UPGRADE');
    });

    it('takes the first dearer account plan in the same currency', () => {
        const accountPlan = (overrides: Partial<PlanTierResponseDto>) => makePlan({ scope: 'ACCOUNT', eventTypeKey: null, ...overrides });
        const plans = [
            accountPlan({ code: 'ACCOUNT_START' }),
            accountPlan({ id: 'same-price', code: 'SAME_PRICE', sortOrder: 1 }),
            accountPlan({ id: 'wrong-currency', code: 'WRONG_CURRENCY', sortOrder: 2, priceAmountMinor: 10_000, priceCurrency: 'USD' }),
            accountPlan({ id: 'upgrade', code: 'UPGRADE', sortOrder: 3, priceAmountMinor: 10_000 }),
        ];

        expect(findNextPlan(plans, 'ACCOUNT', 'ACCOUNT_START')?.code).toBe('UPGRADE');
    });

    it('returns no fallback when the current catalog row is missing', () => {
        expect(findNextPlan([eventPlan()], 'EVENT', 'STALE_PLAN')).toBeUndefined();
    });
});

describe('plan durations', () => {
    const plan = makePlan({
        priceAmountMinor: null,
        initialOptions: [
            makeOption({ id: 'opt-6', months: 6, priceAmountMinor: 6_900, sortOrder: 0 }),
            makeOption({ id: 'opt-9', months: 9, priceAmountMinor: 8_900, sortOrder: 1 }),
            makeOption({ id: 'opt-3', months: 3, priceAmountMinor: 4_900, sortOrder: 1 }),
            makeOption({ id: 'opt-1', months: 1, priceAmountMinor: 1_900, sortOrder: 0, active: false }),
        ],
    });

    it('lists live durations by sort order, then length', () => {
        expect(liveInitialOptions(plan).map((option) => option.id)).toEqual(['opt-6', 'opt-3', 'opt-9']);
    });

    it('picks the shortest live duration', () => {
        expect(shortestInitialOption(plan)?.id).toBe('opt-3');
        expect(shortestInitialOption(makePlan())).toBeNull();
    });

    it('resolves the picked duration, falling back to the shortest', () => {
        expect(resolveInitialOption(plan, 'opt-9')?.id).toBe('opt-9');
        expect(resolveInitialOption(plan, undefined)?.id).toBe('opt-3');
        expect(resolveInitialOption(plan, 'opt-1')?.id).toBe('opt-3');
    });

    it("prices a duration after the plan's promotion", () => {
        const discounted = makePlan({ discountPercent: 10 });
        expect(getOptionPriceDetails(discounted, makeOption({ priceAmountMinor: 10_000 }))).toMatchObject({
            amountMinor: 9_000,
            listAmountMinor: 10_000,
            currency: 'EUR',
            discountActive: true,
        });
    });
});

describe('lite plans', () => {
    const wishbook = makePlan({ code: 'WISHBOOK', moduleKeys: ['qr_cards', 'wishbook'] });
    const qr = makePlan({ code: 'QR', moduleKeys: ['gallery', 'qr_cards'] });
    const start = makePlan({ code: 'START', moduleKeys: ['gallery', 'posts'] });
    const story = makePlan({ code: 'STORY', moduleKeys: ['gallery', 'posts', 'rsvp'] });

    it('calls a plan lite when it has no posts module', () => {
        expect(isLitePlan(wishbook)).toBe(true);
        expect(isLitePlan(start)).toBe(false);
    });

    it('splits full and lite plans, keeping the input order', () => {
        expect(splitLitePlans([wishbook, qr, start, story])).toEqual({ full: [start, story], lite: [wishbook, qr] });
        expect(splitLitePlans([])).toEqual({ full: [], lite: [] });
    });

    it('starts on the first full plan', () => {
        expect(defaultSelectedPlan([wishbook, qr, start, story], undefined)?.code).toBe('START');
    });

    it('starts on the plan asked for, even a lite one', () => {
        expect(defaultSelectedPlan([wishbook, qr, start], 'QR')?.code).toBe('QR');
    });

    it('ignores a code that is not offered', () => {
        expect(defaultSelectedPlan([wishbook, start], 'GONE')?.code).toBe('START');
    });

    it('falls back to the first plan when there are no full plans', () => {
        expect(defaultSelectedPlan([wishbook, qr], null)?.code).toBe('WISHBOOK');
        expect(defaultSelectedPlan([], null)).toBeUndefined();
    });

    it('picks the QR page plans: lite plans with the gallery, then the first full plan, else every full plan', () => {
        const bundle = makePlan({ code: 'BUNDLE', moduleKeys: ['gallery', 'qr_cards', 'wishbook'] });
        expect(qrPagePlans([wishbook, qr, bundle, start, story]).map((plan) => plan.code)).toEqual(['QR', 'BUNDLE', 'START']);
        expect(qrPagePlans([wishbook, start]).map((plan) => plan.code)).toEqual(['START']);
        expect(qrPagePlans([start, story]).map((plan) => plan.code)).toEqual(['START', 'STORY']);
        expect(qrPagePlans([wishbook])).toEqual([]);
    });
});
