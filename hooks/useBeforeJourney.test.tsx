import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBeforeJourney } from '@/hooks/useBeforeJourney';
import { routes } from '@/lib/routes';

const progress = vi.hoisted(() => ({ value: { details: true, rsvp: true, giftAccount: false, schedule: false, invitations: false } }));
vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
}));
vi.mock('@/hooks/useHelpProgress', () => ({ useHelpProgress: () => progress.value }));
vi.mock('@/hooks/useModuleCopy', () => ({ useModuleCopy: () => (key: string) => ({ name: `module.${key}` }) }));

const modules = (keys: string[]) => keys.map((moduleKey) => ({ moduleKey, isEnabled: true, isAvailable: true }));

function event(overrides: Record<string, unknown> = {}) {
    return {
        id: 'e1',
        eventType: 'WEDDING',
        title: 'Maria & Nikos',
        location: {},
        modules: modules(['rsvp', 'wishlist', 'posts']),
        sessions: [],
        schedule: { startAt: '2026-12-12T16:00:00Z', timezone: 'Europe/Athens', rsvpDeadline: '2026-12-01T00:00:00Z' },
        rsvpSummary: { totalMembers: 81, attending: 42, declined: 8, noResponse: 31 },
        ...overrides,
    } as never;
}

const counts = { memberCount: 58, memberLimit: 100, seatsClaimed: 60 };
const now = new Date('2026-11-18T10:00:00Z');

beforeEach(() => {
    progress.value = { details: true, rsvp: true, giftAccount: false, schedule: false, invitations: false };
});

describe('useBeforeJourney', () => {
    it("puts the stops in the mockup's order and makes the first open one current", () => {
        const { result } = renderHook(() => useBeforeJourney(event(), counts, now));
        expect(result.current.stops.map((stop) => [stop.key, stop.status])).toEqual([
            ['details', 'done'],
            ['rsvp', 'done'],
            ['schedule', 'current'],
            ['giftAccount', 'upcoming'],
            ['invitations', 'upcoming'],
        ]);
        expect(result.current.allDone).toBe(false);
    });

    it('gives the current schedule stop its card', () => {
        const schedule = renderHook(() => useBeforeJourney(event(), counts, now)).result.current.stops[2];
        expect(schedule.card).toEqual({ body: 'journey.scheduleCard', action: { label: 'steps.schedule.edit', href: routes.events.tools.schedule('e1') } });
    });

    it('shows the RSVP answers and seats as chips', () => {
        const rsvp = renderHook(() => useBeforeJourney(event(), counts, now)).result.current.stops[1];
        expect(rsvp.chips?.map((chip) => chip.key)).toEqual(['attending', 'declined', 'noResponse', 'seats']);
    });

    it('counts members against the limit on the invitations stop', () => {
        const invitations = renderHook(() => useBeforeJourney(event(), counts, now)).result.current.stops[4];
        expect(invitations.detail).toBe('journey.members:{"count":58,"limit":100}');
    });

    it('is all set when every stop is done', () => {
        progress.value = { details: true, rsvp: true, giftAccount: true, schedule: true, invitations: true };
        const { result } = renderHook(() => useBeforeJourney(event(), counts, now));
        expect(result.current.allDone).toBe(true);
        expect(result.current.stops.every((stop) => stop.status === 'done')).toBe(true);
    });

    it('leaves out RSVP, the gift account and invitations when the event has none of them', () => {
        const lite = event({ modules: modules(['gallery']), rsvpSummary: null });
        const keys = renderHook(() => useBeforeJourney(lite, counts, now)).result.current.stops.map((stop) => stop.key);
        expect(keys).toEqual(['details', 'schedule']);
    });

    it('adds sessions dated before the primary day after the setup stops', () => {
        const sessions = [
            { id: 'henna', title: 'Henna', startAt: '2026-12-11T17:00:00Z', endAt: null, isMain: false, deletedAt: null, displayOrder: 1 },
            { id: 'main', title: 'Ceremony', startAt: '2026-12-12T16:00:00Z', endAt: null, isMain: true, deletedAt: null, displayOrder: 0 },
        ];
        const stops = renderHook(() => useBeforeJourney(event({ sessions }), counts, now)).result.current.stops;
        expect(stops.at(-1)).toMatchObject({ key: 'session-henna', title: 'Henna', status: 'upcoming', icon: 'session' });
    });
});
