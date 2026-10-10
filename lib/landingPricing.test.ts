import { describe, expect, it } from 'vitest';

import type {
    AppMediaConfigDto,
    CoverageOptionResponseDto,
    MemberRoleCatalogDto,
    PlanTierResponseDto,
    PlatformModuleResponseDto,
} from '@/lib/api/types';
import {
    buildLandingPlan,
    formatLandingListPrice,
    formatLandingOptionPrice,
    type LandingPlan,
    type LandingPlanCopy,
    pickedLandingDuration,
} from '@/lib/landingPricing';

function makeOption(overrides: Partial<CoverageOptionResponseDto> = {}): CoverageOptionResponseDto {
    return { id: 'opt-3', kind: 'INITIAL', months: 3, priceAmountMinor: 7900, promoPriceAmountMinor: null, sortOrder: 0, active: true, ...overrides };
}

function makePlan(overrides: Partial<PlanTierResponseDto> = {}): PlanTierResponseDto {
    return {
        id: 'plan-1',
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

const MODULES: PlatformModuleResponseDto[] = [
    { id: 'm-gallery', moduleKey: 'gallery', name: 'Gallery', description: null, isEnabled: true, sortOrder: 0 },
    { id: 'm-rsvp', moduleKey: 'rsvp', name: 'RSVP', description: null, isEnabled: true, sortOrder: 1 },
    { id: 'm-stories', moduleKey: 'stories', name: 'Stories', description: null, isEnabled: true, sortOrder: 2 },
    { id: 'm-wishbook', moduleKey: 'wishbook', name: 'Guestbook', description: null, isEnabled: true, sortOrder: 3 },
    { id: 'm-co-hosts', moduleKey: 'co_hosts', name: 'Co-hosts', description: null, isEnabled: true, sortOrder: 4 },
    { id: 'm-schedule', moduleKey: 'schedule', name: 'Schedule', description: null, isEnabled: true, sortOrder: 5 },
    { id: 'm-member-roles', moduleKey: 'member_roles', name: 'Member roles', description: null, isEnabled: true, sortOrder: 6 },
];

const MEDIA: AppMediaConfigDto = {
    maxFileSizeBytes: 0,
    maxRequestSizeBytes: 0,
    maxImageBytes: 0,
    maxVideoBytes: 0,
    maxStoryVideoBytes: 0,
    maxStoryVideoDurationSeconds: 0,
    maxBatchUploadFiles: 0,
    maxBatchStoryItems: 0,
    maxMediaPerPost: 0,
    maxArchiveSelectedItems: 0,
    maxArchivePartBytes: 0,
    presignedUrlTtlMinutes: 0,
    publicHost: null,
    estimateAvgImageBytes: 4 * 1024 * 1024,
    estimateAvgVideoBytes: 90 * 1024 * 1024,
    estimateImageRatio: 0.7,
    acceptedMimeTypes: [],
    acceptedProfilePictureMimeTypes: [],
    maxImagePixels: 0,
    defaultStoryLifetimeHours: 24,
};

const COPY: LandingPlanCopy = {
    coHosts: (max) => (max === null ? 'Unlimited co-hosts' : `Up to ${max} co-hosts`),
    everythingIn: (planName) => `Everything in ${planName}`,
    guestsUnlimited: 'Unlimited guests',
    guestsUpTo: (count) => `Up to ${count} guests`,
    mediaUnlimited: 'Unlimited',
    moduleWithDetail: (label, detail) => `${label} · ${detail}`,
    qrUpload: 'QR upload',
    scheduleSessions: (max) => (max === null ? 'unlimited sessions' : `up to ${max} sessions`),
    storageUnlimited: 'Unlimited storage',
    memberRoles: (count, custom, examples) => `${count} member roles (${examples.map((label) => label.en).join(', ')})${custom ? ' + your own' : ''}`,
    memberRolesCustomOnly: 'Custom member roles',
};

function role(id: string, retired = false, sortOrder = 0): MemberRoleCatalogDto {
    return {
        id,
        eventTypeKey: 'WEDDING',
        roleKey: id.toUpperCase(),
        label: { en: id, el: id },
        emoji: null,
        maxHolders: null,
        sortOrder,
        hostOnly: false,
        retired,
        sectionLabel: null,
    };
}

const ROLES = { WEDDING: [role('old', true), role('c', false, 2), role('b', false, 1), role('a')] };

const MODULE_NAME = (moduleKey: string) => MODULES.find((module_) => module_.moduleKey === moduleKey)?.name ?? moduleKey;

describe('formatLandingOptionPrice', () => {
    it('renders a whole-euro price in the existing landing style (no decimals, suffixed symbol)', () => {
        expect(formatLandingOptionPrice(makePlan(), makeOption({ priceAmountMinor: 7900 }))).toBe('79€');
    });

    it("applies the plan's active discount before formatting", () => {
        expect(formatLandingOptionPrice(makePlan({ discountPercent: 20 }), makeOption({ priceAmountMinor: 10000 }))).toBe('80€');
    });

    it('returns null when the plan has no currency', () => {
        expect(formatLandingOptionPrice(makePlan({ priceCurrency: null }), makeOption())).toBeNull();
    });

    it("shows a duration's promo price in place of the plan's percent", () => {
        expect(
            formatLandingOptionPrice(makePlan({ discountPercent: 50 }), makeOption({ priceAmountMinor: 12900, promoPriceAmountMinor: 9900 })),
        ).toBe('99€');
    });
});

describe('formatLandingListPrice', () => {
    it('gives the price before a promotion that lowers the duration', () => {
        expect(formatLandingListPrice(makePlan(), makeOption({ priceAmountMinor: 12900, promoPriceAmountMinor: 9900 }))).toBe('129€');
        expect(formatLandingListPrice(makePlan({ discountPercent: 20 }), makeOption({ priceAmountMinor: 10000 }))).toBe('100€');
    });

    it('is null when nothing lowers the duration', () => {
        expect(formatLandingListPrice(makePlan(), makeOption())).toBeNull();
        expect(
            formatLandingListPrice(
                makePlan({ discountEndsAt: '2000-01-01T00:00:00Z' }),
                makeOption({ priceAmountMinor: 12900, promoPriceAmountMinor: 9900 }),
            ),
        ).toBeNull();
    });
});

describe('pickedLandingDuration', () => {
    const plan: LandingPlan = {
        code: 'START',
        audience: '',
        features: [],
        name: 'START',
        photos: '',
        storage: '',
        videos: '',
        durations: [
            { id: 'opt-3', months: 3, price: '79€', listPrice: null },
            { id: 'opt-6', months: 6, price: '99€', listPrice: null },
        ],
        defaultDurationId: 'opt-3',
    };

    it('returns the picked duration', () => {
        expect(pickedLandingDuration(plan, 'opt-6').price).toBe('99€');
    });

    it('falls back to the default when nothing (or something unknown) is picked', () => {
        expect(pickedLandingDuration(plan, undefined).id).toBe('opt-3');
        expect(pickedLandingDuration(plan, 'retired').id).toBe('opt-3');
    });
});

describe('buildLandingPlan', () => {
    it('builds a full card for a plan with no previous tier', () => {
        const plan = makePlan({ moduleKeys: ['gallery'], maxMembers: 150, storageBytes: 16 * 1024 * 1024 * 1024 });

        const card = buildLandingPlan(plan, undefined, MODULES, MEDIA, MODULE_NAME, COPY);

        expect(card).not.toBeNull();
        expect(card?.code).toBe('START');
        expect(card?.name).toBe('START');
        expect(card?.durations).toEqual([{ id: 'opt-3', months: 3, price: '79€', listPrice: null }]);
        expect(card?.defaultDurationId).toBe('opt-3');
        expect(card?.audience).toBe('Up to 150 guests');
        expect(card?.storage).toBe('16 GB');
        expect(card?.features).toEqual(['Gallery']);
    });

    it("names modules as the plan's event type does", () => {
        const plan = makePlan({ moduleKeys: ['gallery'] });
        const moduleName = (moduleKey: string, eventTypeKey: string | null) => (eventTypeKey === 'WEDDING' ? `${moduleKey} for weddings` : moduleKey);

        expect(buildLandingPlan(plan, undefined, MODULES, MEDIA, moduleName, COPY)?.features).toEqual(['gallery for weddings']);
    });

    it('lists live durations in display order and starts on the shortest', () => {
        const plan = makePlan({
            initialOptions: [
                makeOption({ id: 'opt-6', months: 6, priceAmountMinor: 9900, sortOrder: 0 }),
                makeOption({ id: 'opt-3', months: 3, priceAmountMinor: 7900, sortOrder: 1 }),
                makeOption({ id: 'opt-12', months: 12, priceAmountMinor: 14900, sortOrder: 2, active: false }),
            ],
        });

        const card = buildLandingPlan(plan, undefined, MODULES, MEDIA, MODULE_NAME, COPY);

        expect(card?.durations.map((duration) => duration.id)).toEqual(['opt-6', 'opt-3']);
        expect(card?.defaultDurationId).toBe('opt-3');
    });

    it('shows an "Everything in X" rollup plus only the additional modules for each later tier', () => {
        const previous = makePlan({ name: 'START', moduleKeys: ['gallery'] });
        const plan = makePlan({ name: 'STORY', moduleKeys: ['gallery', 'stories', 'rsvp', 'wishbook'] });

        const card = buildLandingPlan(plan, previous, MODULES, MEDIA, MODULE_NAME, COPY);

        expect(card?.features).toEqual(['Everything in START', 'RSVP', 'Stories', 'Guestbook']);
        expect(card?.includedFeatures).toEqual(['Gallery']);
    });

    it('keeps the prior-tier rollup when catalog rows do not repeat inherited modules', () => {
        const previous = makePlan({ name: 'START', moduleKeys: ['gallery', 'rsvp'] });
        const plan = makePlan({ name: 'STORY', moduleKeys: ['stories'] });

        const card = buildLandingPlan(plan, previous, MODULES, MEDIA, MODULE_NAME, COPY);

        expect(card?.features).toEqual(['Everything in START', 'Stories']);
    });

    it('omits the rollup detail when the previous tier has no modules', () => {
        const previous = makePlan({ name: 'START', moduleKeys: [] });
        const plan = makePlan({ name: 'STORY', moduleKeys: ['stories'] });

        const card = buildLandingPlan(plan, previous, MODULES, MEDIA, MODULE_NAME, COPY);

        expect(card?.includedFeatures).toBeUndefined();
    });

    it('uses the cumulative inherited modules for later tiers with sparse catalog rows', () => {
        const previous = makePlan({ name: 'STORY', moduleKeys: ['stories'] });
        const plan = makePlan({ name: 'SIGNATURE', moduleKeys: ['wishbook'] });

        const card = buildLandingPlan(plan, previous, MODULES, MEDIA, MODULE_NAME, COPY, ['gallery', 'rsvp', 'stories', 'gallery']);

        expect(card?.features).toEqual(['Everything in STORY', 'Guestbook']);
        expect(card?.includedFeatures).toEqual(['Gallery', 'RSVP', 'Stories']);
    });

    it("labels modules from the plan's own config", () => {
        const plan = makePlan({
            moduleKeys: ['gallery', 'co_hosts', 'schedule'],
            moduleConfigs: { gallery: { qrUploadEnabled: true }, co_hosts: { maxCoHosts: 2 }, schedule: {} },
        });

        const card = buildLandingPlan(plan, undefined, MODULES, MEDIA, MODULE_NAME, COPY);

        expect(card?.features).toEqual(['Gallery · QR upload', 'Up to 2 co-hosts', 'Schedule · unlimited sessions']);
    });

    it('hides a module whose count cap is 0', () => {
        const plan = makePlan({ moduleKeys: ['gallery', 'co_hosts'], moduleConfigs: { gallery: {}, co_hosts: { maxCoHosts: 0 } } });

        const card = buildLandingPlan(plan, undefined, MODULES, MEDIA, MODULE_NAME, COPY);

        expect(card?.features).toEqual(['Gallery']);
    });

    it('lists an inherited module again when the later tier raises its limit', () => {
        const previous = makePlan({
            name: 'START',
            moduleKeys: ['gallery', 'schedule'],
            moduleConfigs: { gallery: { qrUploadEnabled: false }, schedule: { maxSections: 3 } },
        });
        const plan = makePlan({
            name: 'STORY',
            moduleKeys: ['gallery', 'schedule', 'rsvp'],
            moduleConfigs: { gallery: { qrUploadEnabled: false }, schedule: { maxSections: 10 }, rsvp: {} },
        });

        const card = buildLandingPlan(plan, previous, MODULES, MEDIA, MODULE_NAME, COPY);

        expect(card?.features).toEqual(['Everything in START', 'RSVP', 'Schedule · up to 10 sessions']);
        expect(card?.includedFeatures).toEqual(['Gallery']);
    });

    it('renders "Unlimited" copy for null storage and members', () => {
        const plan = makePlan({ storageBytes: null, maxMembers: null });

        const card = buildLandingPlan(plan, undefined, MODULES, MEDIA, MODULE_NAME, COPY);

        expect(card?.storage).toBe('Unlimited storage');
        expect(card?.audience).toBe('Unlimited guests');
        expect(card?.photos).toBe('Unlimited');
        expect(card?.videos).toBe('Unlimited');
    });

    it('returns null for a plan with no duration on sale', () => {
        expect(buildLandingPlan(makePlan({ initialOptions: [] }), undefined, MODULES, MEDIA, MODULE_NAME, COPY)).toBeNull();
        expect(
            buildLandingPlan(makePlan({ initialOptions: [makeOption({ active: false })] }), undefined, MODULES, MEDIA, MODULE_NAME, COPY),
        ).toBeNull();
    });
});

describe('buildLandingPlan member roles line', () => {
    function card(allowCustom: boolean | undefined, catalog: Record<string, MemberRoleCatalogDto[]> = ROLES) {
        const plan = makePlan({ moduleKeys: ['member_roles'], moduleConfigs: { member_roles: allowCustom === undefined ? {} : { allowCustom } } });
        return buildLandingPlan(plan, undefined, MODULES, MEDIA, MODULE_NAME, COPY, undefined, catalog);
    }

    it('counts active roles only and names the first two in catalog order', () => {
        expect(card(false)?.features).toEqual(['3 member roles (a, b)']);
    });

    it('adds "your own" when the plan allows custom roles', () => {
        expect(card(true)?.features).toEqual(['3 member roles (a, b) + your own']);
    });

    it('shows the custom-only line when the type has no roles', () => {
        expect(card(true, {})?.features).toEqual(['Custom member roles']);
    });

    it('hides the line with no roles and no custom roles', () => {
        expect(card(undefined, {})?.features).toEqual([]);
    });

    it('falls back to the module name without moduleConfigs', () => {
        const plan = makePlan({ moduleKeys: ['member_roles'], moduleConfigs: null });
        expect(buildLandingPlan(plan, undefined, MODULES, MEDIA, MODULE_NAME, COPY, undefined, ROLES)?.features).toEqual(['Member roles']);
    });

    it('lists the line on a higher tier that turns on custom roles', () => {
        const previous = makePlan({ name: 'START', moduleKeys: ['member_roles'], moduleConfigs: { member_roles: { allowCustom: false } } });
        const plan = makePlan({ name: 'STORY', moduleKeys: ['member_roles'], moduleConfigs: { member_roles: { allowCustom: true } } });

        const result = buildLandingPlan(plan, previous, MODULES, MEDIA, MODULE_NAME, COPY, undefined, ROLES);

        expect(result?.features).toEqual(['Everything in START', '3 member roles (a, b) + your own']);
        expect(result?.includedFeatures).toBeUndefined();
    });
});
