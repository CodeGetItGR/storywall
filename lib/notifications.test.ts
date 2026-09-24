import { describe, expect, it } from 'vitest';

import type { NotificationResponseDto } from '@/lib/api/types';

import { notificationCtaRoute } from './notifications';

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

    it('hides the CTA for a target this app does not know', () => {
        expect(
            notificationCtaRoute(notification({ ctaTarget: 'SOMETHING_NEW' as NotificationResponseDto['ctaTarget'], ctaParams: { eventId: 'e' } })),
        ).toBeNull();
    });
});
