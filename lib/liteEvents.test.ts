import { describe, expect, it } from 'vitest';

import type { EventModuleResponseDto } from '@/lib/api/types';
import { eventHomeHref, guestCodeActions, isLiteEvent, isLiteEventRouteAllowed, liteHomeModule } from '@/lib/liteEvents';

function module_(moduleKey: string, isEnabled: boolean, configuration: Record<string, unknown> | null = null): EventModuleResponseDto {
    return { id: moduleKey, eventId: 'e1', moduleKey, isEnabled, isAvailable: isEnabled, configuration, createdAt: '2026-11-02T00:00:00Z' } as EventModuleResponseDto;
}

const gallery = module_('gallery', true, { qrUploadEnabled: true });
const wishbook = module_('wishbook', true);
const noPosts = module_('posts', false);
const posts = module_('posts', true);

function event_(modules: EventModuleResponseDto[], overrides: Partial<{ status: 'ACTIVE' | 'DRAFT'; deletedAt: string | null; suspended: boolean }> = {}) {
    return { id: 'e1', status: 'ACTIVE' as const, deletedAt: null, suspended: false, modules, ...overrides };
}

describe('isLiteEvent', () => {
    it('is true when the plan has no feed', () => {
        expect(isLiteEvent(event_([noPosts, gallery]))).toBe(true);
        expect(isLiteEvent(event_([gallery]))).toBe(true);
    });

    it('is false for a full plan, a suspended event or no event', () => {
        expect(isLiteEvent(event_([posts, gallery]))).toBe(false);
        expect(isLiteEvent(event_([noPosts, gallery], { suspended: true }))).toBe(false);
        expect(isLiteEvent(null)).toBe(false);
    });
});

describe('liteHomeModule', () => {
    it('opens the gallery for Gallery and Bundle, the wishbook for Wishbook', () => {
        expect(liteHomeModule(event_([noPosts, gallery]))).toBe('gallery');
        expect(liteHomeModule(event_([noPosts, gallery, wishbook]))).toBe('gallery');
        expect(liteHomeModule(event_([noPosts, wishbook]))).toBe('wishbook');
    });

    it('is null for a full event or a lite event with neither module', () => {
        expect(liteHomeModule(event_([posts, gallery]))).toBeNull();
        expect(liteHomeModule(event_([noPosts]))).toBeNull();
    });
});

describe('eventHomeHref', () => {
    it('sends draft and deleted events to manage', () => {
        expect(eventHomeHref(event_([noPosts, gallery], { status: 'DRAFT' }))).toBe('/events/e1/manage');
        expect(eventHomeHref(event_([posts], { deletedAt: '2026-11-01T00:00:00Z' }))).toBe('/events/e1/manage');
    });

    it('sends a live lite event to its home module and a full event to the feed', () => {
        expect(eventHomeHref(event_([noPosts, gallery]))).toBe('/events/e1/tools/gallery');
        expect(eventHomeHref(event_([noPosts, wishbook]))).toBe('/events/e1/tools/wishbook');
        expect(eventHomeHref(event_([posts, gallery]))).toBe('/events/e1/feed');
    });

    it('falls back to manage for a lite event with nothing to open', () => {
        expect(eventHomeHref(event_([noPosts]))).toBe('/events/e1/manage');
    });
});

describe('isLiteEventRouteAllowed', () => {
    const lite = event_([noPosts, gallery, wishbook]);

    it('allows the modules the plan has, manage, the QR card, plan pages and checkout', () => {
        for (const path of [
            '/events/e1/tools/gallery',
            '/events/e1/tools/wishbook',
            '/events/e1/manage',
            '/events/e1/manage/qr/link-1/card',
            '/events/e1/settings/plan',
            '/events/e1/settings/addons',
            '/events/e1/checkout/review',
            '/events/e1/checkout/success',
        ]) {
            expect(isLiteEventRouteAllowed(path, lite)).toBe(true);
        }
    });

    it('blocks the feed, guest invitations and every other tool', () => {
        for (const path of [
            '/events/e1/feed',
            '/events/e1/story/schedule',
            '/events/e1/manage/qr',
            '/events/e1/manage/rsvp',
            '/events/e1/tools/gallery/qr',
            '/events/e1/tools/rsvp',
            '/events/e1/tools/playlist',
            '/events/e1/location',
        ]) {
            expect(isLiteEventRouteAllowed(path, lite)).toBe(false);
        }
    });

    it('blocks a module the plan lacks', () => {
        expect(isLiteEventRouteAllowed('/events/e1/tools/wishbook', event_([noPosts, gallery]))).toBe(false);
    });
});

describe('guestCodeActions', () => {
    it('mirrors what the backend offers on the guest code', () => {
        expect(guestCodeActions([noPosts, gallery, wishbook])).toEqual(['UPLOAD', 'WISH']);
        expect(guestCodeActions([noPosts, gallery])).toEqual(['UPLOAD']);
        expect(guestCodeActions([noPosts, module_('gallery', true, { qrUploadEnabled: false }), wishbook])).toEqual(['WISH']);
        expect(guestCodeActions([noPosts])).toEqual([]);
    });
});
