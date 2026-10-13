import { describe, expect, it } from 'vitest';

import type { EventSessionResponseDto } from '@/lib/api/types';
import { buildIcs, calendarEntries, type CalendarEvent, googleCalendarUrl, outlookCalendarUrl } from '@/lib/eventCalendar';

function session(overrides: Partial<EventSessionResponseDto>): EventSessionResponseDto {
    return {
        id: 's',
        title: 'Session',
        startAt: null,
        endAt: null,
        locationName: null,
        displayOrder: 0,
        isMain: false,
        isSecondary: false,
        ...overrides,
    } as EventSessionResponseDto;
}

function event(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
    return {
        title: 'Anna & Nick',
        schedule: { startAt: '2026-08-07T15:00:00Z', endAt: null } as CalendarEvent['schedule'],
        location: { name: 'Agios Nikolaos', address: null, mapsUrl: null },
        sessions: null,
        ...overrides,
    };
}

describe('calendarEntries', () => {
    it('uses the event date with a 6 hour default when there are no sessions', () => {
        const [entry, ...rest] = calendarEntries(event());

        expect(rest).toHaveLength(0);
        expect(entry.sessionId).toBeNull();
        expect(entry.title).toBe('Anna & Nick');
        expect(entry.location).toBe('Agios Nikolaos');
        expect(entry.endAt.toISOString()).toBe('2026-08-07T21:00:00.000Z');
    });

    it('lists only timed sessions, in order, never merged into one span', () => {
        const entries = calendarEntries(
            event({
                sessions: [
                    session({ id: 'later', title: 'After party', startAt: '2026-09-07T20:00:00Z', displayOrder: 0 }),
                    session({
                        id: 'main',
                        title: 'Ceremony',
                        startAt: '2026-08-07T15:00:00Z',
                        endAt: '2026-08-07T16:00:00Z',
                        isMain: true,
                        displayOrder: 1,
                    }),
                    session({ id: 'untimed', title: 'TBD', displayOrder: 2 }),
                ],
            }),
        );

        expect(entries.map((entry) => entry.sessionId)).toEqual(['main', 'later']);
        expect(entries[0].title).toBe('Anna & Nick · Ceremony');
        expect(entries[0].endAt.toISOString()).toBe('2026-08-07T16:00:00.000Z');
        // The main session falls back to the event's place; others don't.
        expect(entries[0].location).toBe('Agios Nikolaos');
        expect(entries[1].location).toBeNull();
    });

    it('falls back to the event date when no session has a start time', () => {
        const entries = calendarEntries(event({ sessions: [session({ id: 'untimed' })] }));

        expect(entries.map((entry) => entry.sessionId)).toEqual([null]);
    });
});

describe('calendar links', () => {
    const [entry] = calendarEntries(event());

    it('builds a Google Calendar template link in UTC', () => {
        const url = new URL(googleCalendarUrl(entry, 'https://example.com/events/1/feed'));

        expect(url.searchParams.get('dates')).toBe('20260807T150000Z/20260807T210000Z');
        expect(url.searchParams.get('text')).toBe('Anna & Nick');
        expect(url.searchParams.get('location')).toBe('Agios Nikolaos');
    });

    it('builds Outlook links for both hosts', () => {
        expect(outlookCalendarUrl(entry, 'x', 'outlook')).toMatch(/^https:\/\/outlook\.live\.com\//);
        expect(new URL(outlookCalendarUrl(entry, 'x', 'microsoft365')).searchParams.get('startdt')).toBe('2026-08-07T15:00:00.000Z');
    });
});

describe('buildIcs', () => {
    it('escapes text, uses CRLF and folds long lines', () => {
        const [entry] = calendarEntries(event({ title: 'Γάμος, Άννα; Νίκος '.repeat(5), location: { name: 'A, B', address: null, mapsUrl: null } }));
        const ics = buildIcs(entry, { uid: 'e1@storywall', url: 'https://example.com/events/1/feed', now: new Date('2026-01-01T00:00:00Z') });

        expect(ics).toContain('\r\nDTSTART:20260807T150000Z\r\n');
        expect(ics).toContain('LOCATION:A\\, B');
        expect(ics).toContain('Γάμος\\, Άννα\\; Νίκος');
        for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    });
});
