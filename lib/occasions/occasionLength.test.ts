import { describe, expect, it } from 'vitest';

import type { AppConfigResponseDto, CoverageOptionResponseDto, PlanTierResponseDto } from '@/lib/api/types';
import { occasionLengthValues } from '@/lib/occasions/occasionLength';

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
        storageBytes: null,
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

const NONE = { lengths: 'none', months: '', monthCount: 0, extendable: 'no' };

describe('occasionLengthValues', () => {
    it('has no lengths without config', () => {
        expect(occasionLengthValues(null, 'WEDDING', 'en')).toEqual(NONE);
    });

    it('has one length when every plan sells the same months', () => {
        const plans = [
            makePlan({ initialOptions: [makeOption({ months: 12 })] }),
            makePlan({ id: 'sig', code: 'SIGNATURE', name: 'SIGNATURE', sortOrder: 1, initialOptions: [makeOption({ id: 'sig-12', months: 12 })] }),
        ];
        expect(occasionLengthValues(config(plans), 'WEDDING', 'en')).toEqual({ lengths: 'single', months: '12', monthCount: 12, extendable: 'no' });
    });

    it('lists every length on sale, shortest first, in the page language', () => {
        const plans = [
            makePlan({
                initialOptions: [makeOption({ id: 'opt-6', months: 6 }), makeOption(), makeOption({ id: 'opt-12', months: 12, active: false })],
            }),
            makePlan({ id: 'sig', code: 'SIGNATURE', name: 'SIGNATURE', sortOrder: 1, initialOptions: [makeOption({ id: 'sig-6', months: 6 })] }),
        ];
        expect(occasionLengthValues(config(plans), 'WEDDING', 'en')).toMatchObject({ lengths: 'span', months: '3 or 6', monthCount: 0 });
        expect(occasionLengthValues(config(plans), 'WEDDING', 'el')).toMatchObject({ months: '3 ή 6' });
    });

    it('leaves out other event types and plans not on sale', () => {
        const plans = [
            makePlan({ initialOptions: [makeOption({ months: 12 })] }),
            makePlan({ id: 'bap', code: 'BAPTISM', name: 'BAPTISM', eventTypeKey: 'BAPTISM' }),
            makePlan({ id: 'hidden', name: 'HIDDEN', isPublic: false, initialOptions: [makeOption({ id: 'h-1', months: 1 })] }),
        ];
        expect(occasionLengthValues(config(plans), 'WEDDING', 'en')).toMatchObject({ lengths: 'single', monthCount: 12 });
        expect(occasionLengthValues(config([]), 'WEDDING', 'en')).toEqual(NONE);
    });

    it('is extendable only while a plan sells an extension', () => {
        const extension = makeOption({ id: 'ext-3', kind: 'EXTENSION' });
        expect(occasionLengthValues(config([makePlan({ extensionOptions: [extension] })]), 'WEDDING', 'en').extendable).toBe('yes');
        expect(occasionLengthValues(config([makePlan({ extensionOptions: [{ ...extension, active: false }] })]), 'WEDDING', 'en').extendable).toBe(
            'no',
        );
    });
});
