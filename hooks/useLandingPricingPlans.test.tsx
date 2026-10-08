import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useLandingPricingPlans } from '@/hooks/useLandingPricingPlans';
import type { AppConfigResponseDto, PlanTierResponseDto } from '@/lib/api/types';

const publicGet = vi.fn();
vi.mock('@/lib/api/client', () => ({
    api: { publicGet: (...a: unknown[]) => publicGet(...a) },
    ApiError: class ApiError extends Error {},
}));

const MESSAGES = {
    LandingPage: {
        pricing: {
            everythingIn: 'Everything in {plan}',
            scheduleSessions: 'Up to {count} schedule sessions',
            scheduleSessionsUnlimited: 'Unlimited schedule sessions',
            coHosts: 'Up to {count} co-hosts',
            coHostsUnlimited: 'Unlimited co-hosts',
            galleryWithQrUpload: 'Gallery with QR upload',
            guestsUnlimited: 'Unlimited guests',
            guestsUpTo: 'Up to {count} guests',
            mediaUnlimited: 'Unlimited',
            storageUnlimited: 'Unlimited storage',
        },
    },
    Modules: { gallery: { name: 'Gallery' }, rsvp: { name: 'RSVP' } },
};

function planTier(overrides: Partial<PlanTierResponseDto>): PlanTierResponseDto {
    return {
        id: 'p1',
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
        initialOptions: [
            { id: 'opt-3', kind: 'INITIAL', months: 3, priceAmountMinor: 7900, promoPriceAmountMinor: null, sortOrder: 0, active: true },
        ],
        extensionOptions: [],
        ...overrides,
    };
}

function makeConfig(): AppConfigResponseDto {
    return {
        featureFlags: [],
        media: {
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
        },
        pagination: { defaultPageSize: 20, maxPageSize: 50 },
        planTiers: [
            planTier({ id: 'p1', code: 'START', isDefault: true, eventTypeKey: 'WEDDING' }),
            planTier({ id: 'p2', code: 'VIP', name: 'VIP', eventTypeKey: 'SOCIAL_EVENT' }),
            planTier({ id: 'p3', code: 'REUNION', name: 'REUNION', eventTypeKey: 'REUNION', sortOrder: 1 }),
        ],
        paidServices: [],
        eventModuleKeys: ['gallery'],
        modules: [{ id: 'm1', moduleKey: 'gallery', name: 'Gallery', description: null, isEnabled: true, sortOrder: 0 }],
        eventTypes: [],
        eventTypeKeys: ['WEDDING', 'BAPTISM', 'SOCIAL_EVENT', 'REUNION'],
        translations: { eventTypes: {} },
        rsvp: { minAdults: 1, maxAdults: 5, minChildren: 0, maxChildren: 4 },
        withdrawal: { termsVersion: '1' } as AppConfigResponseDto['withdrawal'],
        coverage: { maxLeadDays: 548, defaultEventDurationHours: 24 },
        contentLimits: {} as AppConfigResponseDto['contentLimits'],
        reactionTypesByEventType: {},
        memberRolesByEventType: {},
        landingCategories: [],
        rateLimits: [],
        reportTargetTypes: ['POST'],
        reportReasons: ['SPAM'],
        newsletter: { enabled: false, discountPercent: 10, rewardValidityMonths: 12 },
        eventDeletion: { codeDigits: 6, codeValidMinutes: 10, maxCodeAttempts: 5 },
        betaFeedback: { enabled: false, screenshotMaxBytes: 10485760, screenshotMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] },
    };
}

function makeWrapper(locale: string) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        return (
            <QueryClientProvider client={queryClient}>
                <NextIntlClientProvider locale={locale} messages={MESSAGES}>
                    {children}
                </NextIntlClientProvider>
            </QueryClientProvider>
        );
    };
}

const wrapper = makeWrapper('en');
const greekWrapper = makeWrapper('el');

describe('useLandingPricingPlans', () => {
    it('lists each event type with its own plans, grouped by category, and hides an empty type and category', async () => {
        const config = makeConfig();
        config.translations = {
            eventTypes: {
                WEDDING: { name: { en: 'Wedding', el: 'Γάμος' }, tagline: {}, voice: {} as never },
                SOCIAL_EVENT: { name: { en: 'Party' }, tagline: {}, voice: {} as never },
                REUNION: { name: { en: 'Reunion' }, tagline: {}, voice: {} as never },
            },
        };
        config.landingCategories = [
            { id: 'wed', name: { en: 'Weddings', el: 'Γάμοι' }, description: {}, isDefault: true, eventTypeKeys: ['WEDDING', 'BAPTISM'] },
            { id: 'empty', name: { en: 'Empty' }, description: {}, isDefault: false, eventTypeKeys: ['BIRTHDAY'] },
            { id: 'vip', name: { en: 'VIP' }, description: { en: 'Parties' }, isDefault: false, eventTypeKeys: ['SOCIAL_EVENT', 'REUNION'] },
        ];
        publicGet.mockResolvedValue(config);

        const { result } = renderHook(() => useLandingPricingPlans(), { wrapper });

        await waitFor(() => expect(result.current.groups).not.toBeNull());
        const groups = result.current.groups ?? [];
        expect(groups.map((group) => [group.id, group.label, group.items.map((item) => [item.id, item.label])])).toEqual([
            ['wed', 'Weddings', [['wedding', 'Wedding']]],
            [
                'vip',
                'VIP',
                [
                    ['social-event', 'Party'],
                    ['reunion', 'Reunion'],
                ],
            ],
        ]);
        expect(groups[0].items[0].plans[0].durations).toEqual([{ id: 'opt-3', months: 3, price: '79€', listPrice: null }]);
        expect(groups[1].items.map((item) => item.plans.map((plan) => plan.code))).toEqual([['VIP'], ['REUNION']]);
        expect(result.current.defaultEventTypeId).toBe('wedding');
    });

    it('falls back to the first type when the default category is empty, and to English labels', async () => {
        const config = makeConfig();
        config.landingCategories = [
            { id: 'empty', name: { en: 'Empty' }, description: {}, isDefault: true, eventTypeKeys: ['BIRTHDAY'] },
            { id: 'vip', name: { en: 'VIP' }, description: {}, isDefault: false, eventTypeKeys: ['SOCIAL_EVENT'] },
        ];
        publicGet.mockResolvedValue(config);

        const { result } = renderHook(() => useLandingPricingPlans(), { wrapper: greekWrapper });

        await waitFor(() => expect(result.current.groups).not.toBeNull());
        expect(result.current.defaultEventTypeId).toBe('social-event');
        expect(result.current.groups?.[0].label).toBe('VIP');
    });

    it('shows a type listed in two categories only in the first', async () => {
        const config = makeConfig();
        config.landingCategories = [
            { id: 'a', name: { en: 'A' }, description: {}, isDefault: false, eventTypeKeys: ['REUNION'] },
            { id: 'b', name: { en: 'B' }, description: {}, isDefault: true, eventTypeKeys: ['REUNION', 'WEDDING'] },
        ];
        publicGet.mockResolvedValue(config);

        const { result } = renderHook(() => useLandingPricingPlans(), { wrapper });

        await waitFor(() => expect(result.current.groups).not.toBeNull());
        expect(result.current.groups?.map((group) => group.items.map((item) => item.id))).toEqual([['reunion'], ['wedding']]);
        expect(result.current.defaultEventTypeId).toBe('wedding');
    });

    it('rolls a card up into the previous card shown, skipping a plan that is not on sale', async () => {
        const config = makeConfig();
        config.planTiers = [
            planTier({ id: 'a', code: 'A', name: 'A', eventTypeKey: 'SOCIAL_EVENT', sortOrder: 0 }),
            planTier({ id: 'b', code: 'B', name: 'B', eventTypeKey: 'SOCIAL_EVENT', sortOrder: 1, initialOptions: [] }),
            planTier({ id: 'c', code: 'C', name: 'C', eventTypeKey: 'SOCIAL_EVENT', sortOrder: 2 }),
        ];
        config.landingCategories = [{ id: 'vip', name: { en: 'VIP' }, description: {}, isDefault: true, eventTypeKeys: ['SOCIAL_EVENT'] }];
        publicGet.mockResolvedValue(config);

        const { result } = renderHook(() => useLandingPricingPlans(), { wrapper });

        await waitFor(() => expect(result.current.groups).not.toBeNull());
        const plans = result.current.groups?.[0].items[0].plans ?? [];
        expect(plans.map((plan) => plan.code)).toEqual(['A', 'C']);
        expect(plans[1].features[0]).toBe('Everything in A');
    });

    it('gives types in the same category their own plans, without rolling up across types', async () => {
        const config = makeConfig();
        config.modules = [
            { id: 'm1', moduleKey: 'gallery', name: 'Gallery', description: null, isEnabled: true, sortOrder: 0 },
            { id: 'm2', moduleKey: 'rsvp', name: 'RSVP', description: null, isEnabled: true, sortOrder: 1 },
        ];
        config.planTiers = [
            planTier({ id: 's1', code: 'S_BASIC', name: 'Basic', eventTypeKey: 'SOCIAL_EVENT', sortOrder: 0 }),
            planTier({ id: 's2', code: 'S_GOLD', name: 'Gold', eventTypeKey: 'SOCIAL_EVENT', sortOrder: 1, moduleKeys: ['gallery', 'rsvp'] }),
            planTier({ id: 'r1', code: 'R_BASIC', name: 'Basic', eventTypeKey: 'REUNION', sortOrder: 0 }),
        ];
        config.landingCategories = [{ id: 'vip', name: { en: 'VIP' }, description: {}, isDefault: true, eventTypeKeys: ['SOCIAL_EVENT', 'REUNION'] }];
        publicGet.mockResolvedValue(config);

        const { result } = renderHook(() => useLandingPricingPlans(), { wrapper });

        await waitFor(() => expect(result.current.groups).not.toBeNull());
        const [social, reunion] = result.current.groups?.[0].items ?? [];
        expect(social.plans.map((plan) => plan.features)).toEqual([['Gallery'], ['Everything in Basic', 'RSVP']]);
        expect(reunion.plans.map((plan) => plan.code)).toEqual(['R_BASIC']);
        expect(reunion.plans[0].features).toEqual(['Gallery']);
        expect(reunion.plans[0].includedFeatures).toBeUndefined();
    });

    it('keeps the same groups across renders while the config is unchanged', async () => {
        const config = makeConfig();
        config.landingCategories = [{ id: 'wed', name: { en: 'Weddings' }, description: {}, isDefault: true, eventTypeKeys: ['WEDDING'] }];
        publicGet.mockResolvedValue(config);

        const { result, rerender } = renderHook(() => useLandingPricingPlans(), { wrapper });

        await waitFor(() => expect(result.current.groups).not.toBeNull());
        const groups = result.current.groups;
        rerender();
        expect(result.current.groups).toBe(groups);
    });

    it('treats a config without landingCategories as no groups', async () => {
        const config = makeConfig();
        (config as { landingCategories?: unknown }).landingCategories = undefined;
        publicGet.mockResolvedValue(config);

        const { result } = renderHook(() => useLandingPricingPlans(), { wrapper });

        await waitFor(() => expect(result.current.groups).toEqual([]));
    });

    it('returns no groups when no category has plans', async () => {
        const config = makeConfig();
        config.landingCategories = [];
        publicGet.mockResolvedValue(config);

        const { result } = renderHook(() => useLandingPricingPlans(), { wrapper });

        await waitFor(() => expect(result.current.groups).toEqual([]));
        expect(result.current.defaultEventTypeId).toBeNull();
    });

    it('returns null groups before the config has loaded', () => {
        publicGet.mockReturnValue(new Promise(() => {}));

        const { result } = renderHook(() => useLandingPricingPlans(), { wrapper });

        expect(result.current.groups).toBeNull();
        expect(result.current.defaultEventTypeId).toBeNull();
    });
});
