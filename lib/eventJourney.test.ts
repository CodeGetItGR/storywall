import { describe, expect, it } from 'vitest';

import type { HelpProgress } from '@/hooks/useHelpProgress';
import { capabilitiesOf } from '@/lib/__fixtures__/eventCapabilities';
import type { EventSessionResponseDto } from '@/lib/api/types';
import { addDays, daysBetween, localDay } from '@/lib/datetime';
import {
    currentPhase,
    hasEventDate,
    isOverviewPath,
    journeyPrintHref,
    journeyStepsLeft,
    phaseOfDay,
    primaryDay,
    sessionsByPhase,
    sessionStates,
    setupStepKeys,
} from '@/lib/eventJourney';
import { routes } from '@/lib/routes';

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

describe('journeyPrintHref', () => {
    function withModules(modules: { moduleKey: string; isEnabled: boolean; isAvailable: boolean }[]) {
        return { id: 'e1', status: 'ACTIVE', deletedAt: null, modules, capabilities: capabilitiesOf(modules) } as never;
    }

    it('opens the gallery on a lite event', () => {
        expect(journeyPrintHref(withModules([{ moduleKey: 'gallery', isEnabled: true, isAvailable: true }]))).toBe(routes.events.tools.gallery('e1'));
    });
    it('opens the QR links on a full event', () => {
        expect(journeyPrintHref(withModules([{ moduleKey: 'posts', isEnabled: true, isAvailable: true }]))).toBe(routes.events.invitationsQr('e1'));
    });
});

const posts = { moduleKey: 'posts', isEnabled: true, isAvailable: true };

function fullEvent(over: Record<string, unknown> = {}) {
    const event = {
        id: 'e1',
        status: 'ACTIVE',
        sessions: [],
        schedule: { startAt: '2026-12-12T16:00:00Z', timezone: tz },
        // `posts` makes it a full event: its capabilities say lite when the plan leaves out the feed.
        modules: [
            posts,
            { moduleKey: 'rsvp', isEnabled: true, isAvailable: true },
            { moduleKey: 'wishlist', isEnabled: true, isAvailable: true },
        ],
        ...over,
    };
    return { ...event, capabilities: capabilitiesOf(event.modules) } as never;
}

const noneDone: HelpProgress = { details: false, rsvp: false, giftAccount: false, schedule: false, invitations: false };
const allDone: HelpProgress = { details: true, rsvp: true, giftAccount: true, schedule: true, invitations: true };

describe('setupStepKeys', () => {
    it('lists every setup stop a full event with RSVP and a wishlist has, in path order', () => {
        expect(setupStepKeys(fullEvent())).toEqual(['details', 'rsvp', 'schedule', 'giftAccount', 'invitations']);
    });
    it('drops RSVP and the gift account when those modules are off', () => {
        expect(setupStepKeys(fullEvent({ modules: [posts] }))).toEqual(['details', 'schedule', 'invitations']);
    });
    it('drops the schedule and invitations for a lite event', () => {
        expect(setupStepKeys(fullEvent({ modules: [] }))).toEqual(['details']);
    });
});

describe('journeyStepsLeft', () => {
    const before = new Date('2026-11-20T10:00:00Z');

    it('counts setup stops not done before the day', () => {
        expect(journeyStepsLeft(fullEvent(), noneDone, before)).toBe(5);
        expect(journeyStepsLeft(fullEvent(), { ...noneDone, details: true, schedule: true }, before)).toBe(3);
    });
    it('adds sessions before the day that have not ended', () => {
        const ev = fullEvent({
            sessions: [session('henna', '2026-12-10T17:00:00Z', '2026-12-10T20:00:00Z'), session('main', '2026-12-12T16:00:00Z', null, { isMain: true })],
        });
        expect(journeyStepsLeft(ev, allDone, before)).toBe(1);
        expect(journeyStepsLeft(ev, allDone, new Date('2026-12-11T10:00:00Z'))).toBe(0);
    });
    it('counts the day sessions not ended on the day', () => {
        const ev = fullEvent({
            sessions: [
                session('church', '2026-12-12T14:00:00Z', '2026-12-12T15:00:00Z', { isMain: true }),
                session('party', '2026-12-12T18:00:00Z', '2026-12-12T23:00:00Z'),
            ],
        });
        expect(journeyStepsLeft(ev, noneDone, new Date('2026-12-12T16:00:00Z'))).toBe(1);
    });
    it('has no count after the day', () => {
        expect(journeyStepsLeft(fullEvent(), noneDone, new Date('2026-12-20T10:00:00Z'))).toBeNull();
    });
});

describe('isOverviewPath', () => {
    it('is the dashboard with no tab or the overview tab', () => {
        expect(isOverviewPath('e1', routes.events.manage('e1'), '')).toBe(true);
        expect(isOverviewPath('e1', routes.events.manage('e1'), 'tab=overview')).toBe(true);
    });
    it('is not a dashboard section or another page', () => {
        expect(isOverviewPath('e1', routes.events.manage('e1'), 'tab=members')).toBe(false);
        expect(isOverviewPath('e1', routes.events.invitationsQr('e1'), '')).toBe(false);
        expect(isOverviewPath('e1', routes.events.feed('e1'), '')).toBe(false);
    });
});

// A lite event may have no date or time zone: it stays before its day and has no primary day.
describe('an event without a date', () => {
    const undated = { sessions: [], schedule: { startAt: null, timezone: null } } as never;

    it('has no primary day and is always before it', () => {
        expect(hasEventDate(undated)).toBe(false);
        expect(primaryDay(undated)).toBeNull();
        expect(currentPhase(undated, new Date('2030-01-01T10:00:00Z'))).toBe('before');
    });

    it('still has a date when it has one', () => {
        expect(hasEventDate(event([]))).toBe(true);
    });
});
