import type { CoverageOptionResponseDto, PlanTierResponseDto } from '@/lib/api/types';

export function extensionFixture(overrides: Partial<CoverageOptionResponseDto> = {}): CoverageOptionResponseDto {
    return {
        id: 'ext-6',
        kind: 'EXTENSION',
        months: 6,
        priceAmountMinor: 2_900,
        promoPriceAmountMinor: null,
        sortOrder: 0,
        active: true,
        ...overrides,
    };
}

// An EVENT plan as the admin plan list returns it, with only the fields the
// extension screens read filled in with care.
export function eventPlanFixture(overrides: Partial<PlanTierResponseDto> = {}): PlanTierResponseDto {
    return {
        id: 'plan-classic',
        code: 'CLASSIC',
        scope: 'EVENT',
        name: 'Classic',
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
        requirements: null,
        ...overrides,
    } as PlanTierResponseDto;
}
