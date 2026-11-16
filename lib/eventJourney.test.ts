import { describe, expect, it } from 'vitest';

import type { EventSessionResponseDto } from '@/lib/api/types';
import { addDays, daysBetween, localDay } from '@/lib/datetime';
import { currentPhase, phaseOfDay, primaryDay, sessionsByPhase, sessionStates } from '@/lib/eventJourney';

const tz = 'Europe/Athens';

function session(id: string, startAt: string | null, endAt: string | null = null, extra: Partial<EventSessionResponseDto> = {}) {
    return {
        id,
        title: id,
        startAt,
        endAt,
        isMain: false,
        isSecondary: false,
        deletedAt: null,
        displayOrder: 0,
        ...extra,
    } as EventSessionResponseDto;
}

function event(sessions: EventSessionResponseDto[], startAt = '2026-12-12T16:00:00Z') {
    return { sessions, schedule: { startAt, timezone: tz } } as never;
}

describe('day helpers', () => {
    it('reads the calendar day in the time zone', () => {
        expect(localDay('2026-12-11T22:30:00Z', tz)).toBe('2026-12-12');
    });
    it('adds days across a month end', () => {
        expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    });
    it('counts whole days between two days', () => {
        expect(daysBetween('2026-11-18', '2026-12-12')).toBe(24);
    });
});

describe('primaryDay', () => {
    it("is the main session's day", () => {
        expect(primaryDay(event([session('main', '2026-12-13T15:00:00Z', null, { isMain: true })]))).toBe('2026-12-13');
    });
    it("falls back to the event's start when the main session has no time", () => {
        expect(primaryDay(event([session('main', null, null, { isMain: true })]))).toBe('2026-12-12');
    });
});

describe('phases', () => {
    it('places a day before, on or after the primary day', () => {
        expect(phaseOfDay('2026-12-11', '2026-12-12')).toBe('before');
        expect(phaseOfDay('2026-12-12', '2026-12-12')).toBe('day');
        expect(phaseOfDay('2026-12-13', '2026-12-12')).toBe('after');
    });
    it('uses the event time zone for today', () => {
        // 22:30 UTC on the 11th is already the 12th in Athens.
        expect(currentPhase(event([]), new Date('2026-12-11T22:30:00Z'))).toBe('day');
    });
});

describe('sessionsByPhase', () => {
    it('splits timed sessions by their day and keeps untimed ones on the day', () => {
        const henna = session('henna', '2026-12-11T17:00:00Z');
        const ceremony = session('ceremony', '2026-12-12T16:00:00Z', null, { isMain: true });
        const party = session('party', '2026-12-12T21:00:00Z');
        const brunch = session('brunch', '2026-12-13T09:00:00Z');
        const untimed = session('photos', null);
        const deleted = session('gone', '2026-12-12T18:00:00Z', null, { deletedAt: '2026-11-01T00:00:00Z' });
        const groups = sessionsByPhase(event([party, brunch, untimed, ceremony, henna, deleted]));
        expect(groups.before.map((s) => s.id)).toEqual(['henna']);
        expect(groups.day.map((s) => s.id)).toEqual(['ceremony', 'party', 'photos']);
        expect(groups.after.map((s) => s.id)).toEqual(['brunch']);
    });
});

describe('sessionStates', () => {
    const ceremony = session('ceremony', '2026-12-12T16:00:00Z', '2026-12-12T17:00:00Z');
    const reception = session('reception', '2026-12-12T18:30:00Z');
    const party = session('party', '2026-12-12T21:00:00Z');
    const list = [ceremony, reception, party];

    it('marks ended, running and later sessions', () => {
        expect(sessionStates(list, tz, new Date('2026-12-12T19:00:00Z'))).toEqual(['done', 'now', 'upcoming']);
    });
    it('runs a session without an end until the next one starts', () => {
        expect(sessionStates(list, tz, new Date('2026-12-12T21:30:00Z'))).toEqual(['done', 'done', 'now']);
    });
    it('ends the last open session with its day', () => {
        expect(sessionStates(list, tz, new Date('2026-12-13T08:00:00Z'))).toEqual(['done', 'done', 'done']);
    });
    it('leaves an untimed session upcoming', () => {
        expect(sessionStates([session('x', null)], tz, new Date('2026-12-12T19:00:00Z'))).toEqual(['upcoming']);
    });
});
