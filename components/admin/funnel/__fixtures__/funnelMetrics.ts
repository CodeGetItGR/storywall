import type { FunnelCohortDto, FunnelMetricsResponseDto } from '@/lib/api/types';

export function funnelMetricsFixture(overrides: Partial<FunnelMetricsResponseDto> = {}): FunnelMetricsResponseDto {
    return {
        since: null,
        until: null,
        generatedAt: '2026-09-30T10:00:00Z',
        funnel: {
            signedUp: 1240,
            emailVerified: 1010,
            createdEvent: 612,
            paidHost: 187,
            repeatPaidHost: 23,
            engagedHost: 164,
            adminSettledHost: 9,
        },
        stuck: {
            unverifiedOver7Days: 180,
            verifiedNoEvent: 390,
            eventNeverPaid: 410,
            abandonedCheckout: 96,
            paidNotEngaged: 41,
        },
        activity: {
            activeLast7Days: 88,
            activeLast30Days: 214,
            inactiveOver30Days: 12,
            neverRecorded: 1014,
        },
        timeToConvert: {
            medianHoursToVerify: 0.4,
            medianHoursToFirstEvent: 26.5,
            medianHoursFirstEventToPaid: 108,
        },
        guestToHost: { attendedFirst: 140, thenHosted: 31, thenPaid: 12 },
        accounts: {
            signedUpByProvider: { LOCAL: 820, OAUTH: 380, INVITE: 40 },
            byLocale: { el: 910, en: 330 },
            suspended: 3,
            deleted: 17,
        },
        paidEvents: {
            count: 214,
            ended: 150,
            endedWithoutUploads: 11,
            endedWithoutGuests: 6,
            medianGuests: 42,
            medianUploads: 180.5,
            withUpgrade: 30,
            withStoragePack: 18,
            withExtension: 7,
        },
        revenue: {
            totals: [
                {
                    currency: 'EUR',
                    grossMinor: 2_140_000,
                    refundedMinor: 60_000,
                    netMinor: 2_080_000,
                    payingAccounts: 187,
                    netPerPayingAccountMinor: 11_123,
                },
            ],
            byKind: [
                { currency: 'EUR', kind: 'ACTIVATION', orders: 214, amountMinor: 1_900_000 },
                { currency: 'EUR', kind: 'UPGRADE', orders: 30, amountMinor: 180_000 },
            ],
            refunds: 5,
            adminSettledOrders: 9,
            ordersByBuyerType: { CONSUMER: 240, BUSINESS: 12 },
            discountRedemptions: 14,
            partnerRedemptions: 6,
        },
        ...overrides,
    };
}

/** Nothing happened: every count 0, every median null, no money. */
export function emptyFunnelMetricsFixture(): FunnelMetricsResponseDto {
    return {
        since: null,
        until: null,
        generatedAt: '2026-09-30T10:00:00Z',
        funnel: { signedUp: 0, emailVerified: 0, createdEvent: 0, paidHost: 0, repeatPaidHost: 0, engagedHost: 0, adminSettledHost: 0 },
        stuck: { unverifiedOver7Days: 0, verifiedNoEvent: 0, eventNeverPaid: 0, abandonedCheckout: 0, paidNotEngaged: 0 },
        activity: { activeLast7Days: 0, activeLast30Days: 0, inactiveOver30Days: 0, neverRecorded: 0 },
        timeToConvert: { medianHoursToVerify: null, medianHoursToFirstEvent: null, medianHoursFirstEventToPaid: null },
        guestToHost: { attendedFirst: 0, thenHosted: 0, thenPaid: 0 },
        accounts: { signedUpByProvider: {}, byLocale: {}, suspended: 0, deleted: 0 },
        paidEvents: {
            count: 0,
            ended: 0,
            endedWithoutUploads: 0,
            endedWithoutGuests: 0,
            medianGuests: null,
            medianUploads: null,
            withUpgrade: 0,
            withStoragePack: 0,
            withExtension: 0,
        },
        revenue: {
            totals: [],
            byKind: [],
            refunds: 0,
            adminSettledOrders: 0,
            ordersByBuyerType: {},
            discountRedemptions: 0,
            partnerRedemptions: 0,
        },
    };
}

export function funnelCohortsFixture(weeks = 12): FunnelCohortDto[] {
    const start = Date.UTC(2026, 6, 13); // a Monday
    return Array.from({ length: weeks }, (_, index) => {
        const signedUp = index % 4 === 0 ? 0 : 20 + index * 3;
        return {
            weekStart: new Date(start + index * 7 * 24 * 60 * 60 * 1000).toISOString(),
            signedUp,
            emailVerified: Math.round(signedUp * 0.8),
            createdEvent: Math.round(signedUp * 0.5),
            paidHost: Math.round(signedUp * 0.15),
            engagedHost: Math.round(signedUp * 0.12),
        };
    });
}
