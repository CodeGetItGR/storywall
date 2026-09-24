import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useLandingPricingPlans } from '@/hooks/useLandingPricingPlans';
import type { AppConfigResponseDto } from '@/lib/api/types';

const publicGet = vi.fn();
vi.mock('@/lib/api/client', () => ({
    api: { publicGet: (...a: unknown[]) => publicGet(...a) },
    ApiError: class ApiError extends Error {},
}));

const MESSAGES = {
    LandingPage: {
        pricing: {
            baselineFeatures: ['Countdown', 'Event schedule'],
            categories: { wedding: { label: 'Wedding' }, vip: { label: 'VIP' } },
            everythingIn: 'Everything in {plan}',
            guestsUnlimited: 'Unlimited guests',
            guestsUpTo: 'Up to {count} guests',
            mediaUnlimited: 'Unlimited',
            storageUnlimited: 'Unlimited storage',
        },
    },
    Modules: { gallery: { name: 'Gallery' } },
};

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
        },
        pagination: { defaultPageSize: 20, maxPageSize: 50 },
        planTiers: [
            {
                id: 'p1',
                code: 'START',
                scope: 'EVENT',
                name: 'START',
                description: null,
                sortOrder: 0,
                isDefault: true,
                isAssignable: true,
                isPublic: true,
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
                eventTypeKey: 'WEDDING',
                sharedGroupKey: null,
                initialOptions: [{ id: 'opt-3', kind: 'INITIAL', months: 3, priceAmountMinor: 7900, sortOrder: 0, active: true }],
                extensionOptions: [],
            },
        ],
        paidServices: [],
        eventModuleKeys: ['gallery'],
        modules: [{ id: 'm1', moduleKey: 'gallery', name: 'Gallery', description: null, isEnabled: true, sortOrder: 0 }],
        eventTypes: [],
        eventTypeKeys: ['WEDDING', 'BAPTISM', 'SOCIAL_EVENT'],
        translations: { eventTypes: {} },
        rsvp: { minAdults: 1, maxAdults: 5, minChildren: 0, maxChildren: 4 },
        withdrawal: { termsVersion: '1' } as AppConfigResponseDto['withdrawal'],
        coverage: { maxLeadDays: 548, defaultEventDurationHours: 24 },
        contentLimits: {} as AppConfigResponseDto['contentLimits'],
        reactionTypesByEventType: {},
        rateLimits: [],
        reportTargetTypes: ['POST'],
        reportReasons: ['SPAM'],
        newsletter: { enabled: false, discountPercent: 10, rewardValidityMonths: 12 },
    };
}

function wrapper({ children }: { children: React.ReactNode }) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return (
        <QueryClientProvider client={queryClient}>
            <NextIntlClientProvider locale="en" messages={MESSAGES}>
                {children}
            </NextIntlClientProvider>
        </QueryClientProvider>
    );
}

describe('useLandingPricingPlans', () => {
    it('resolves the wedding tab from the public config catalog', async () => {
        publicGet.mockResolvedValue(makeConfig());

        const { result } = renderHook(() => useLandingPricingPlans(), { wrapper });

        await waitFor(() => expect(result.current.categories).not.toBeNull());

        expect(result.current.categories?.wedding.label).toBe('Wedding');
        expect(result.current.categories?.wedding.plans).toHaveLength(1);
        expect(result.current.categories?.wedding.plans[0].name).toBe('START');
        expect(result.current.categories?.wedding.plans[0].durations).toEqual([{ id: 'opt-3', months: 3, price: '79€' }]);
        expect(result.current.categories?.vip.plans).toHaveLength(0);
    });

    it('returns null categories before the config has loaded', () => {
        publicGet.mockReturnValue(new Promise(() => {}));

        const { result } = renderHook(() => useLandingPricingPlans(), { wrapper });

        expect(result.current.categories).toBeNull();
    });
});
