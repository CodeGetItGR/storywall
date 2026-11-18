import { describe, expect, it } from 'vitest';

import { planRequirementsOf } from '@/lib/__fixtures__/planRequirements';
import type { AppConfigResponseDto, CoverageOptionResponseDto, PlanTierResponseDto } from '@/lib/api/types';
import { occasionPriceValues, photoPlansFromPrice, sellsPhotoPlanAlone } from '@/lib/occasions/occasionPrice';

function makeOption(overrides: Partial<CoverageOptionResponseDto> = {}): CoverageOptionResponseDto {
    return {
        id: 'opt-3',
        kind: 'INITIAL',
        months: 3,
        priceAmountMinor: 11900,
        promoPriceAmountMinor: null,
        sortOrder: 0,
        active: true,
        ...overrides,
    };
}

function makePlan(overrides: Partial<PlanTierResponseDto> = {}): PlanTierResponseDto {
    return {
        id: 'plan-start',
        code: 'START',
        scope: 'EVENT',
        name: 'START',
        description: null,
        sortOrder: 0,
        isDefault: false,
        isAssignable: true,
        isPublic: true,
        isGiftable: true,
        storageBytes: 16 * 1024 * 1024 * 1024,
        maxMembers: 150,
        priceAmountMinor: null,
        priceCurrency: 'EUR',
        billingPeriod: 'ONE_TIME',
        discountPercent: null,
        discountLabel: null,
        discountStartsAt: null,
        discountEndsAt: null,
        moduleKeys: ['gallery', 'posts'],
        paidModules: [],
        moduleConfigs: null,
        eventTypeKey: 'WEDDING',
        sharedGroupKey: null,
        initialOptions: [makeOption()],
        extensionOptions: [],
        requirements: planRequirementsOf(overrides.moduleKeys ?? ['gallery', 'posts']),
        ...overrides,
    };
}

function config(planTiers: PlanTierResponseDto[]): AppConfigResponseDto {
    return { planTiers, memberRolesByEventType: {} } as unknown as AppConfigResponseDto;
}

const NONE = { range: 'none', from: '', fromName: '', to: '', toName: '' };

describe('occasionPriceValues', () => {
    it('has no prices without config', () => {
        expect(occasionPriceValues(null, 'WEDDING', 'en')).toEqual(NONE);
    });

    it('spans the cheapest and dearest plan of the event type', () => {
        const plans = [
            makePlan({ id: 'sig', code: 'SIGNATURE', name: 'SIGNATURE', sortOrder: 2, initialOptions: [makeOption({ priceAmountMinor: 25900 })] }),
            makePlan(),
            makePlan({
                id: 'bap',
                code: 'BAPTISM',
                name: 'BAPTISM',
                eventTypeKey: 'BAPTISM',
                initialOptions: [makeOption({ priceAmountMinor: 4900 })],
            }),
        ];
        expect(occasionPriceValues(config(plans), 'WEDDING', 'en')).toEqual({
            range: 'span',
            from: '119€',
            fromName: 'START',
            to: '259€',
            toName: 'SIGNATURE',
        });
    });

    it('reaches the dearest duration on sale, at its promo price', () => {
        const plans = [
            makePlan({ initialOptions: [makeOption(), makeOption({ id: 'opt-6', months: 6, priceAmountMinor: 14900, sortOrder: 1 })] }),
            makePlan({
                id: 'sig',
                code: 'SIGNATURE',
                name: 'SIGNATURE',
                sortOrder: 2,
                initialOptions: [
                    makeOption({ id: 'sig-3', priceAmountMinor: 25900 }),
                    makeOption({ id: 'sig-6', months: 6, priceAmountMinor: 36900, promoPriceAmountMinor: 32900, sortOrder: 1 }),
                    makeOption({ id: 'sig-12', months: 12, priceAmountMinor: 49900, sortOrder: 2, active: false }),
                ],
            }),
        ];
        expect(occasionPriceValues(config(plans), 'WEDDING', 'en')).toEqual({
            range: 'span',
            from: '119€',
            fromName: 'START',
            to: '329€',
            toName: 'SIGNATURE',
        });
    });

    it('spans one plan sold at two durations', () => {
        const plan = makePlan({ initialOptions: [makeOption({ id: 'opt-6', months: 6, priceAmountMinor: 14900, sortOrder: 1 }), makeOption()] });
        expect(occasionPriceValues(config([plan]), 'WEDDING', 'en')).toMatchObject({ range: 'span', from: '119€', to: '149€', toName: 'START' });
    });

    it('has a single price for one plan at one duration', () => {
        expect(occasionPriceValues(config([makePlan()]), 'WEDDING', 'en')).toMatchObject({ range: 'single', from: '119€', to: '119€' });
    });

    it('leaves out plans that are not on sale', () => {
        const hidden = makePlan({ id: 'hidden', name: 'HIDDEN', isPublic: false, initialOptions: [makeOption({ priceAmountMinor: 900 })] });
        const inactive = makePlan({ id: 'inactive', name: 'INACTIVE', initialOptions: [makeOption({ active: false })] });
        expect(occasionPriceValues(config([hidden, inactive]), 'WEDDING', 'en')).toEqual(NONE);
        expect(occasionPriceValues(config([hidden, makePlan()]), 'WEDDING', 'en')).toMatchObject({ range: 'single', from: '119€' });
    });
});

const LITE = { id: 'lite', code: 'QR', name: 'QR', sortOrder: 0, moduleKeys: ['gallery', 'qr_cards'] };
const WISHBOOK = { id: 'wb', code: 'WISHBOOK', name: 'WISHBOOK', sortOrder: 0, moduleKeys: ['qr_cards', 'wishbook'] };

describe('lite plans in occasionPriceValues', () => {
    it('counts full plans only', () => {
        const plans = [makePlan({ ...LITE, initialOptions: [makeOption({ priceAmountMinor: 4900 })] }), makePlan()];
        expect(occasionPriceValues(config(plans), 'WEDDING', 'en')).toMatchObject({ range: 'single', from: '119€', fromName: 'START' });
    });

    it('has no prices when only lite plans are on sale', () => {
        expect(occasionPriceValues(config([makePlan(LITE)]), 'WEDDING', 'en')).toEqual(NONE);
    });
});

describe('photoPlansFromPrice', () => {
    it('is empty without config', () => {
        expect(photoPlansFromPrice(null, 'WEDDING', 'en')).toBe('');
    });

    it('quotes the cheapest plan with the gallery, lite ones included', () => {
        const plans = [
            makePlan({ ...WISHBOOK, initialOptions: [makeOption({ priceAmountMinor: 2900 })] }),
            makePlan({ ...LITE, initialOptions: [makeOption({ priceAmountMinor: 4900 })] }),
            makePlan({ id: 'start', code: 'START', sortOrder: 3 }),
        ];
        expect(photoPlansFromPrice(config(plans), 'WEDDING', 'en')).toBe('49€');
    });

    it('is empty when no plan has the gallery', () => {
        expect(photoPlansFromPrice(config([makePlan(WISHBOOK)]), 'WEDDING', 'en')).toBe('');
    });
});

describe('sellsPhotoPlanAlone', () => {
    const START = { id: 'start', code: 'START', sortOrder: 3 };

    it('is false without config', () => {
        expect(sellsPhotoPlanAlone(null, 'WEDDING')).toBe(false);
    });

    it('is true with a lite plan that has the gallery', () => {
        expect(sellsPhotoPlanAlone(config([makePlan(LITE), makePlan(START)]), 'WEDDING')).toBe(true);
    });

    it('is false with only full plans, or a lite plan without the gallery', () => {
        expect(sellsPhotoPlanAlone(config([makePlan(START)]), 'WEDDING')).toBe(false);
        expect(sellsPhotoPlanAlone(config([makePlan(WISHBOOK), makePlan(START)]), 'WEDDING')).toBe(false);
    });
});
