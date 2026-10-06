import { describe, expect, it } from 'vitest';

import type { NotificationResponseDto } from '@/lib/api/types';

import { notificationCopyType, notificationCtaRoute, notificationSeverity } from './notifications';

function notification(overrides: Partial<NotificationResponseDto>): NotificationResponseDto {
    return {
        id: 'n-1',
        recipientMemberId: null,
        type: 'EVENT_AUTO_DELETE_WARNING',
        referenceType: null,
        referenceId: null,
        payload: {},
        readAt: null,
        createdAt: '2026-09-24T10:00:00Z',
        deletedAt: null,
        ...overrides,
    };
}

describe('notificationCtaRoute', () => {
    it('sends the coverage-ending CTA to the plan screen with the extension picker open', () => {
        expect(notificationCtaRoute(notification({ ctaTarget: 'EVENT_COVERAGE_EXTEND', ctaParams: { eventId: 'event-1' } }))).toBe(
            '/events/event-1/settings/plan?extend=1',
        );
    });

    it('sends the book-ready CTA to the wishbook', () => {
        expect(notificationCtaRoute(notification({ ctaTarget: 'EVENT_WISHBOOK', ctaParams: { eventId: 'event-1' } }))).toBe(
            '/events/event-1/tools/wishbook',
        );
    });

    it('hides the CTA for a target this app does not know', () => {
        expect(
            notificationCtaRoute(notification({ ctaTarget: 'SOMETHING_NEW' as NotificationResponseDto['ctaTarget'], ctaParams: { eventId: 'e' } })),
        ).toBeNull();
    });
});

describe('withdrawal and storage-trim notifications', () => {
    it('gives a one-order refund its own copy and a calm severity', () => {
        const refund = notification({ type: 'WITHDRAWAL_REFUNDED', payload: { scope: 'ORDER', orderId: 'o-1' } });
        expect(notificationCopyType(refund)).toBe('WITHDRAWAL_REFUNDED_ORDER');
        expect(notificationSeverity(refund)).toBe('INFO');
    });

    it('keeps the event-deleted treatment for a whole-event refund', () => {
        const refund = notification({ type: 'WITHDRAWAL_REFUNDED', payload: { scope: 'EVENT' } });
        expect(notificationCopyType(refund)).toBe('WITHDRAWAL_REFUNDED');
        expect(notificationSeverity(refund)).toBe('CRITICAL');
    });

    it('falls back to the storage-trim severities when the server sends none', () => {
        expect(notificationSeverity(notification({ type: 'STORAGE_TRIM_SCHEDULED' }))).toBe('WARNING');
        expect(notificationSeverity(notification({ type: 'STORAGE_TRIM_WARNING' }))).toBe('CRITICAL');
    });
});
