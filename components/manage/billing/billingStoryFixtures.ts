import type { BillingData } from '@/hooks/useEventBillingPanel';
import type { EventScheduleDto, EventUsageResponseDto, OrderSummaryDto } from '@/lib/api/types';

const GB = 1024 ** 3;

// Billing data for stories and tests: a live Premium event with two paid orders.
export const billingSchedule: EventScheduleDto = {
    startAt: '2026-12-12T16:00:00Z',
    endAt: null,
    coverageEndsAt: '2027-03-12T16:00:00Z',
    projectedCoverage: null,
    timezone: 'Europe/Athens',
    rsvpDeadline: null,
};

export const billingUsage: EventUsageResponseDto = {
    eventId: 'evt-billing',
    planTier: 'PREMIUM',
    storageBytes: 1.2 * GB,
    planStorageBytes: 10 * GB,
    extraStorageBytes: 0,
    storageLimitBytes: 10 * GB,
    storagePercent: 12,
    memberCount: 58,
    memberLimit: 100,
    memberPercent: 58,
};

export function billingOrder(overrides: Partial<OrderSummaryDto> = {}): OrderSummaryDto {
    return {
        id: 'ord-activation',
        kind: 'ACTIVATION',
        status: 'PAID',
        amountMinor: 8900,
        addonAmountMinor: null,
        currency: 'EUR',
        paidAt: '2026-09-12T10:00:00Z',
        createdAt: '2026-09-12T10:00:00Z',
        setupAmountMinor: null,
        eventDayAmountMinor: null,
        hostingAmountMinor: null,
        coverageMonths: 6,
        coverageMonthsAdded: null,
        coverageStartsAt: null,
        coverageEndsAt: null,
        buyerType: 'CONSUMER',
        breakdown: null,
        paidByCaller: true,
        firstPurchase: null,
        ...overrides,
    };
}

export const billingOrders: OrderSummaryDto[] = [
    billingOrder({ id: 'ord-storage', kind: 'STORAGE_PACK', amountMinor: 1500, paidAt: '2026-10-02T10:00:00Z', createdAt: '2026-10-02T10:00:00Z' }),
    billingOrder(),
];

export const billingData: BillingData = {
    eventStatus: 'ACTIVE',
    planTierCode: 'PREMIUM',
    planTierName: 'Premium',
    coverageOptionId: 'cov-6',
    coverageMonths: 6,
    orders: billingOrders,
    addons: [],
    discount: null,
    storageTrimDueAt: null,
};
