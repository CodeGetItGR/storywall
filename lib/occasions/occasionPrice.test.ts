import { describe, expect, it } from 'vitest';

import type { AppConfigResponseDto, CoverageOptionResponseDto, PlanTierResponseDto } from '@/lib/api/types';
import { occasionPriceValues } from '@/lib/occasions/occasionPrice';

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
        moduleKeys: ['gallery'],
        paidModules: [],
        moduleConfigs: null,
        eventTypeKey: 'WEDDING',
        sharedGroupKey: null,
        initialOptions: [makeOption()],
        extensionOptions: [],
        ...overrides,
    };
}

function config(planTiers: PlanTierResponseDto[]): AppConfigResponseDto {
    return { planTiers, memberRolesByEventType: {} } as unknown as AppConfigResponseDto;
}

const NONE = { range: 'none', from: '', fromName: '', to: '', toName: '' };

describe('occasionPriceValues', () => {
    it('has no prices without config', () => {
        expect(occasionPriceValues(null, 'WEDDING')).toEqual(NONE);
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
        expect(occasionPriceValues(config(plans), 'WEDDING')).toEqual({
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
        expect(occasionPriceValues(config(plans), 'WEDDING')).toEqual({
            range: 'span',
            from: '119€',
            fromName: 'START',
            to: '329€',
            toName: 'SIGNATURE',
        });
    });

    it('spans one plan sold at two durations', () => {
        const plan = makePlan({ initialOptions: [makeOption({ id: 'opt-6', months: 6, priceAmountMinor: 14900, sortOrder: 1 }), makeOption()] });
        expect(occasionPriceValues(config([plan]), 'WEDDING')).toMatchObject({ range: 'span', from: '119€', to: '149€', toName: 'START' });
    });

    it('has a single price for one plan at one duration', () => {
        expect(occasionPriceValues(config([makePlan()]), 'WEDDING')).toMatchObject({ range: 'single', from: '119€', to: '119€' });
    });

    it('leaves out plans that are not on sale', () => {
        const hidden = makePlan({ id: 'hidden', name: 'HIDDEN', isPublic: false, initialOptions: [makeOption({ priceAmountMinor: 900 })] });
        const inactive = makePlan({ id: 'inactive', name: 'INACTIVE', initialOptions: [makeOption({ active: false })] });
        expect(occasionPriceValues(config([hidden, inactive]), 'WEDDING')).toEqual(NONE);
        expect(occasionPriceValues(config([hidden, makePlan()]), 'WEDDING')).toMatchObject({ range: 'single', from: '119€' });
    });
});
