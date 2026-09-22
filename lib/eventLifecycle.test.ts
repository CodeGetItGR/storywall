import { describe, expect, it } from 'vitest';

import { isDeletedEventRouteAllowed, isEventDeleted } from '@/lib/eventLifecycle';

describe('isEventDeleted', () => {
    it('is true only when deletedAt is set', () => {
        expect(isEventDeleted({ deletedAt: '2026-09-22T10:00:00Z' })).toBe(true);
        expect(isEventDeleted({ deletedAt: null })).toBe(false);
        expect(isEventDeleted(null)).toBe(false);
        expect(isEventDeleted(undefined)).toBe(false);
    });
});

describe('isDeletedEventRouteAllowed', () => {
    const id = 'event-1';

    it('allows manage, gallery and wishbook', () => {
        expect(isDeletedEventRouteAllowed('/events/event-1/manage', id)).toBe(true);
        expect(isDeletedEventRouteAllowed('/events/event-1/tools/gallery', id)).toBe(true);
        expect(isDeletedEventRouteAllowed('/events/event-1/tools/wishbook', id)).toBe(true);
    });

    it('blocks every other event route, including nested ones under allowed roots', () => {
        expect(isDeletedEventRouteAllowed('/events/event-1/feed', id)).toBe(false);
        expect(isDeletedEventRouteAllowed('/events/event-1/story/schedule', id)).toBe(false);
        expect(isDeletedEventRouteAllowed('/events/event-1/settings/addons', id)).toBe(false);
        expect(isDeletedEventRouteAllowed('/events/event-1/checkout/review', id)).toBe(false);
        expect(isDeletedEventRouteAllowed('/events/event-1/manage/qr', id)).toBe(false);
        expect(isDeletedEventRouteAllowed('/events/event-1/tools/gallery/qr', id)).toBe(false);
        expect(isDeletedEventRouteAllowed('/events/event-1/tools/rsvp', id)).toBe(false);
    });
});
