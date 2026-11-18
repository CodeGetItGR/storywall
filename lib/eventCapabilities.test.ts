import { describe, expect, it } from 'vitest';

import type { EventCapabilitiesDto, EventHome, EventModuleResponseDto, EventStatus } from '@/lib/api/types';
import { eventCapabilities, eventHomeHref, isLiteEventRouteAllowed, isLiveLiteEvent, liteModulePages } from '@/lib/eventCapabilities';

function module_(moduleKey: string, isEnabled = true): EventModuleResponseDto {
    return {
        id: moduleKey,
        eventId: 'e1',
        moduleKey,
        isEnabled,
        isAvailable: isEnabled,
        configuration: null,
        createdAt: '2026-11-02T00:00:00Z',
    } as EventModuleResponseDto;
}

function capabilities(kind: 'FULL' | 'LITE', home: EventHome): EventCapabilitiesDto {
    const full = kind === 'FULL';
    return {
        kind,
        home,
        takesGuests: full,
        hasSchedule: true,
        showsDetailsSettings: full,
        showsShareLinks: full,
        showsGuestCode: !full,
        guestCodeActions: full ? [] : ['UPLOAD'],
    };
}

// One row per plan the backend sells, by what it answers for the event.
const PLANS = {
    QR: { modules: [module_('gallery')], capabilities: capabilities('LITE', 'GALLERY') },
    WISHBOOK: { modules: [module_('wishbook')], capabilities: capabilities('LITE', 'WISHBOOK') },
    BUNDLE: { modules: [module_('gallery'), module_('wishbook')], capabilities: capabilities('LITE', 'GALLERY') },
    START: { modules: [module_('posts'), module_('gallery')], capabilities: capabilities('FULL', 'FEED') },
};

type State = { status: EventStatus; deletedAt: string | null; suspended: boolean };
const STATES: Record<string, State> = {
    live: { status: 'ACTIVE', deletedAt: null, suspended: false },
    draft: { status: 'DRAFT', deletedAt: null, suspended: false },
    deleted: { status: 'ACTIVE', deletedAt: '2026-11-01T00:00:00Z', suspended: false },
    suspended: { status: 'ACTIVE', deletedAt: null, suspended: true },
};

function event_(plan: keyof typeof PLANS, state: keyof typeof STATES = 'live') {
    return { id: 'e1', ...PLANS[plan], ...STATES[state] };
}

describe('eventHomeHref', () => {
    it.each([
        ['QR', 'live', '/events/e1/tools/gallery'],
        ['WISHBOOK', 'live', '/events/e1/tools/wishbook'],
        ['BUNDLE', 'live', '/events/e1/tools/gallery'],
        ['START', 'live', '/events/e1/feed'],
        ['QR', 'draft', '/events/e1/manage'],
        ['START', 'draft', '/events/e1/manage'],
        ['WISHBOOK', 'deleted', '/events/e1/manage'],
        ['START', 'deleted', '/events/e1/manage'],
        ['QR', 'suspended', '/events/e1/feed'],
    ] as const)('%s, %s: %s', (plan, state, href) => {
        expect(eventHomeHref(event_(plan, state))).toBe(href);
    });

    it('opens manage for a lite event with neither module', () => {
        expect(eventHomeHref({ ...event_('QR'), modules: [], capabilities: capabilities('LITE', 'MANAGE') })).toBe('/events/e1/manage');
    });
});

describe('isLiveLiteEvent', () => {
    it.each([
        ['QR', 'live', true],
        ['WISHBOOK', 'live', true],
        ['BUNDLE', 'live', true],
        ['START', 'live', false],
        ['QR', 'draft', false],
        ['QR', 'deleted', false],
        ['QR', 'suspended', false],
    ] as const)('%s, %s: %s', (plan, state, expected) => {
        expect(isLiveLiteEvent(event_(plan, state))).toBe(expected);
    });

    it('is false without an event', () => {
        expect(isLiveLiteEvent(null)).toBe(false);
    });
});

describe('eventCapabilities', () => {
    it('passes on what the backend sent', () => {
        expect(eventCapabilities(event_('BUNDLE'))).toEqual(PLANS.BUNDLE.capabilities);
    });

    it('has none for a suspended event', () => {
        expect(eventCapabilities(event_('START', 'suspended'))).toBeNull();
    });

    it('reads an event without them (an old demo snapshot) as full', () => {
        const capabilities_ = eventCapabilities({ ...event_('START'), capabilities: undefined });
        expect(capabilities_).toMatchObject({ kind: 'FULL', home: 'FEED', takesGuests: true, hasSchedule: true });
    });
});

describe('liteModulePages', () => {
    it('lists the gallery and wishbook the plan paid for', () => {
        expect(liteModulePages(PLANS.QR.modules)).toEqual(['gallery']);
        expect(liteModulePages(PLANS.WISHBOOK.modules)).toEqual(['wishbook']);
        expect(liteModulePages(PLANS.BUNDLE.modules)).toEqual(['gallery', 'wishbook']);
        expect(liteModulePages([module_('gallery', false)])).toEqual([]);
    });
});

describe('isLiteEventRouteAllowed', () => {
    const bundle = event_('BUNDLE');

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
            expect(isLiteEventRouteAllowed(path, bundle)).toBe(true);
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
            expect(isLiteEventRouteAllowed(path, bundle)).toBe(false);
        }
    });

    it('blocks a module the plan lacks', () => {
        expect(isLiteEventRouteAllowed('/events/e1/tools/wishbook', event_('QR'))).toBe(false);
    });
});
