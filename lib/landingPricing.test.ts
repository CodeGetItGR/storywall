import { describe, expect, it } from 'vitest';

import type { AppMediaConfigDto, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import {
    buildLandingPlan,
    formatLandingPlanPrice,
    LANDING_PRICING_CATEGORY_EVENT_TYPES,
    type LandingPlanCopy,
    resolveLandingCategoryPlans,
} from '@/lib/landingPricing';

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
        storageBytes: 16 * 1024 * 1024 * 1024,
        maxMembers: 150,
        autoDeleteMonths: 3,
        priceAmountMinor: 7900,
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

const MODULES: PlatformModuleResponseDto[] = [
    { id: 'm-gallery', moduleKey: 'gallery', name: 'Gallery', description: null, isEnabled: true, sortOrder: 0 },
    { id: 'm-rsvp', moduleKey: 'rsvp', name: 'RSVP', description: null, isEnabled: true, sortOrder: 1 },
    { id: 'm-stories', moduleKey: 'stories', name: 'Stories', description: null, isEnabled: true, sortOrder: 2 },
    { id: 'm-wishbook', moduleKey: 'wishbook', name: 'Guestbook', description: null, isEnabled: true, sortOrder: 3 },
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
};

const COPY: LandingPlanCopy = {
    accessMonths: (months) => `Access for ${months} months after the event`,
    accessUnlimited: 'Access never expires',
    baselineFeatures: ['Countdown', 'Event schedule', 'Download all photos & videos', 'Unique StoryWall link'],
    everythingIn: (planName) => `Everything in ${planName}`,
    guestsUnlimited: 'Unlimited guests',
    guestsUpTo: (count) => `Up to ${count} guests`,
    mediaUnlimited: 'Unlimited',
    storageUnlimited: 'Unlimited storage',
};

const MODULE_NAME = (moduleKey: string) => MODULES.find((module_) => module_.moduleKey === moduleKey)?.name ?? moduleKey;

describe('resolveLandingCategoryPlans', () => {
    it('returns the wedding-tab plans sorted by sortOrder', () => {
        const plans = [
            makePlan({ id: 'p2', code: 'SIGNATURE', sortOrder: 2, eventTypeKey: 'WEDDING' }),
            makePlan({ id: 'p1', code: 'START', sortOrder: 0, eventTypeKey: 'WEDDING' }),
            makePlan({ id: 'p3', code: 'VIP_START', sortOrder: 0, eventTypeKey: 'SOCIAL_EVENT' }),
        ];

        const result = resolveLandingCategoryPlans(plans, 'wedding');

        expect(result.map((plan) => plan.code)).toEqual(['START', 'SIGNATURE']);
    });

    it('falls back to BAPTISM for the wedding tab when there are no WEDDING plans', () => {
        const plans = [makePlan({ code: 'BAPTISM_BASIC', eventTypeKey: 'BAPTISM' })];

        const result = resolveLandingCategoryPlans(plans, 'wedding');

        expect(result.map((plan) => plan.code)).toEqual(['BAPTISM_BASIC']);
    });

    it('excludes archived and non-public plans', () => {
        const plans = [
            makePlan({ code: 'ARCHIVED', isAssignable: false }),
            makePlan({ code: 'INTERNAL', isPublic: false }),
            makePlan({ code: 'VISIBLE' }),
        ];

        const result = resolveLandingCategoryPlans(plans, 'wedding');

        expect(result.map((plan) => plan.code)).toEqual(['VISIBLE']);
    });

    it('returns an empty array when the category has no matching event type at all', () => {
        expect(resolveLandingCategoryPlans([makePlan({ eventTypeKey: 'PRIVATE_PARTY' })], 'vip')).toEqual([]);
    });

    it('defines the wedding and vip category mappings', () => {
        expect(LANDING_PRICING_CATEGORY_EVENT_TYPES).toEqual({ wedding: ['WEDDING', 'BAPTISM'], vip: ['SOCIAL_EVENT'] });
    });
});

describe('formatLandingPlanPrice', () => {
    it('renders a whole-euro price in the existing landing style (no decimals, suffixed symbol)', () => {
        expect(formatLandingPlanPrice(makePlan({ priceAmountMinor: 7900, priceCurrency: 'EUR' }))).toBe('79€');
    });

    it('applies an active discount before formatting', () => {
        const plan = makePlan({ priceAmountMinor: 10000, priceCurrency: 'EUR', discountPercent: 20 });
        expect(formatLandingPlanPrice(plan)).toBe('80€');
    });

    it('returns null when the plan has no price', () => {
        expect(formatLandingPlanPrice(makePlan({ priceAmountMinor: null }))).toBeNull();
    });
});

describe('buildLandingPlan', () => {
    it('builds a full card for a plan with no previous tier', () => {
        const plan = makePlan({ moduleKeys: ['gallery'], maxMembers: 150, storageBytes: 16 * 1024 * 1024 * 1024, autoDeleteMonths: 3 });

        const card = buildLandingPlan(plan, undefined, MODULES, MEDIA, MODULE_NAME, COPY);

        expect(card).not.toBeNull();
        expect(card?.name).toBe('START');
        expect(card?.price).toBe('79€');
        expect(card?.audience).toBe('Up to 150 guests');
        expect(card?.storage).toBe('16 GB');
        expect(card?.features).toEqual([
            'Countdown',
            'Event schedule',
            'Download all photos & videos',
            'Unique StoryWall link',
            'Gallery',
            'Access for 3 months after the event',
        ]);
    });

    it('shows an "Everything in X" rollup plus only the additional modules for each later tier', () => {
        const previous = makePlan({ name: 'START', moduleKeys: ['gallery'] });
        const plan = makePlan({ name: 'STORY', moduleKeys: ['gallery', 'stories', 'rsvp', 'wishbook'], autoDeleteMonths: 6 });

        const card = buildLandingPlan(plan, previous, MODULES, MEDIA, MODULE_NAME, COPY);

        expect(card?.features).toEqual(['Everything in START', 'RSVP', 'Stories', 'Guestbook', 'Access for 6 months after the event']);
        expect(card?.includedFeatures).toEqual(['Countdown', 'Event schedule', 'Download all photos & videos', 'Unique StoryWall link', 'Gallery']);
    });

    it('keeps the prior-tier rollup when catalog rows do not repeat inherited modules', () => {
        const previous = makePlan({ name: 'START', moduleKeys: ['gallery', 'rsvp'] });
        const plan = makePlan({ name: 'STORY', moduleKeys: ['stories'], autoDeleteMonths: 6 });

        const card = buildLandingPlan(plan, previous, MODULES, MEDIA, MODULE_NAME, COPY);

        expect(card?.features).toEqual(['Everything in START', 'Stories', 'Access for 6 months after the event']);
    });

    it('uses the cumulative inherited modules for later tiers with sparse catalog rows', () => {
        const previous = makePlan({ name: 'STORY', moduleKeys: ['stories'] });
        const plan = makePlan({ name: 'SIGNATURE', moduleKeys: ['wishbook'], autoDeleteMonths: 9 });

        const card = buildLandingPlan(plan, previous, MODULES, MEDIA, MODULE_NAME, COPY, undefined, ['gallery', 'rsvp', 'stories', 'gallery']);

        expect(card?.features).toEqual(['Everything in STORY', 'Guestbook', 'Access for 9 months after the event']);
        expect(card?.includedFeatures).toEqual([
            'Countdown',
            'Event schedule',
            'Download all photos & videos',
            'Unique StoryWall link',
            'Gallery',
            'RSVP',
            'Stories',
        ]);
    });

    it('renders "Unlimited" copy for null storage, members, and access window', () => {
        const plan = makePlan({ storageBytes: null, maxMembers: null, autoDeleteMonths: null });

        const card = buildLandingPlan(plan, undefined, MODULES, MEDIA, MODULE_NAME, COPY);

        expect(card?.storage).toBe('Unlimited storage');
        expect(card?.audience).toBe('Unlimited guests');
        expect(card?.photos).toBe('Unlimited');
        expect(card?.videos).toBe('Unlimited');
        expect(card?.features).toContain('Access never expires');
    });

    it('returns null for a plan with no resolvable price', () => {
        expect(buildLandingPlan(makePlan({ priceAmountMinor: null }), undefined, MODULES, MEDIA, MODULE_NAME, COPY)).toBeNull();
    });

    it('uses a supplied no-charge label when a selectable configured plan has no price', () => {
        const card = buildLandingPlan(makePlan({ priceAmountMinor: null }), undefined, MODULES, MEDIA, MODULE_NAME, COPY, 'No charge');

        expect(card?.price).toBe('No charge');
    });
});
