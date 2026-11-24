import { describe, expect, it } from 'vitest';

import type { EventDetailResponseDto, EventSessionResponseDto } from '@/lib/api/types';
import { feedModuleSection } from '@/lib/feedModuleBlocks';
import { drawsCard, drawsScheduleCard, drawsScheduleTimeline, feedScheduleDay, feedScheduleDays, hasTimedSessions } from '@/lib/feedSchedule';
import { createFeedModeSection } from '@/lib/feedSections';

const session = (id: string, startAt: string | null, endAt: string | null = null) =>
    ({
        id,
        title: id,
        startAt,
        endAt,
        locationName: null,
        deletedAt: null,
        isMain: false,
        displayOrder: 0,
        rsvpEnabled: false,
    }) as EventSessionResponseDto;
const event = (sessions: EventSessionResponseDto[], startAt: string | null = '2026-12-19T14:00:00Z') =>
    ({ schedule: { startAt, timezone: 'Europe/Athens' }, sessions }) as unknown as Pick<EventDetailResponseDto, 'schedule' | 'sessions'>;

// Athens is UTC+2 in December: the party ends at half past midnight there.
const twoDays = [
    session('brunch', '2026-12-20T09:00:00Z', '2026-12-20T11:00:00Z'),
    session('church', '2026-12-19T14:00:00Z', '2026-12-19T15:00:00Z'),
    session('party', '2026-12-19T17:00:00Z', '2026-12-19T22:30:00Z'),
    session('untimed', null),
];

const rows = (now: string, sessions = twoDays) => feedScheduleDay(event(sessions), new Date(now))?.rows.map((row) => [row.session.id, row.state]);

describe('feedScheduleDay', () => {
    it("shows the first day's sessions before the event, in time order, all upcoming", () => {
        const day = feedScheduleDay(event(twoDays), new Date('2026-12-01T10:00:00Z'));
        expect(day?.day).toBe('2026-12-19');
        expect(day?.timeZone).toBe('Europe/Athens');
        expect(day?.rows.map((row) => [row.session.id, row.state])).toEqual([
            ['church', 'upcoming'],
            ['party', 'upcoming'],
        ]);
    });

    it('marks the running session now and the past ones done', () => {
        expect(rows('2026-12-19T17:30:00Z')).toEqual([
            ['church', 'done'],
            ['party', 'now'],
        ]);
    });

    it('keeps the day in view between two of its sessions', () => {
        expect(rows('2026-12-19T16:00:00Z')).toEqual([
            ['church', 'done'],
            ['party', 'upcoming'],
        ]);
    });

    it('keeps the evening in view while its last session runs past midnight', () => {
        // 22:15 UTC is 00:15 on the 20th in Athens.
        expect(rows('2026-12-19T22:15:00Z')).toEqual([
            ['church', 'done'],
            ['party', 'now'],
        ]);
    });

    it("moves to the next day once a day's sessions are over, and hides after the last", () => {
        expect(rows('2026-12-19T22:30:00Z')).toEqual([['brunch', 'upcoming']]);
        expect(rows('2026-12-20T10:00:00Z')).toEqual([['brunch', 'now']]);
        expect(rows('2026-12-20T11:00:00Z')).toBeUndefined();
    });

    it("moves to a later day once it starts, though an earlier day's session still runs", () => {
        const camping = [session('camping', '2026-12-18T10:00:00Z', '2026-12-20T18:00:00Z'), ...twoDays];
        expect(rows('2026-12-19T13:00:00Z', camping)).toEqual([['camping', 'now']]);
        expect(rows('2026-12-19T14:30:00Z', camping)?.[0]).toEqual(['church', 'now']);
    });

    it("counts a session's day in the event's time zone", () => {
        // 22:00 UTC on the 19th is midnight on the 20th in Athens.
        const night = [session('night', '2026-12-19T22:00:00Z', '2026-12-19T23:00:00Z')];
        expect(feedScheduleDay(event(night), new Date('2026-12-01T10:00:00Z'))?.day).toBe('2026-12-20');
    });

    it('leaves out deleted sessions', () => {
        const deleted = { ...session('gone', '2026-12-19T14:00:00Z'), deletedAt: '2026-12-01T10:00:00Z' };
        expect(hasTimedSessions(event([deleted]))).toBe(false);
        expect(rows('2026-12-01T10:00:00Z', [deleted])).toBeUndefined();
    });

    it('has nothing to show without a date or timed sessions', () => {
        expect(feedScheduleDay(event(twoDays, null), new Date('2026-12-01T10:00:00Z'))).toBeNull();
        expect(hasTimedSessions(event([session('untimed', null)]))).toBe(false);
        expect(hasTimedSessions(event(twoDays))).toBe(true);
        expect(hasTimedSessions(event(twoDays, null))).toBe(false);
    });
});

describe('feedScheduleDays', () => {
    it("gives every timed session, by day in the event's time zone, over or not", () => {
        const days = feedScheduleDays(event(twoDays), new Date('2026-12-19T17:30:00Z'));
        expect(days.map(({ day, rows: dayRows }) => [day, dayRows.map((row) => [row.session.id, row.state])])).toEqual([
            [
                '2026-12-19',
                [
                    ['church', 'done'],
                    ['party', 'now'],
                ],
            ],
            ['2026-12-20', [['brunch', 'upcoming']]],
        ]);
        expect(feedScheduleDays(event(twoDays), new Date('2027-01-01T00:00:00Z')).flatMap((day) => day.rows)).toHaveLength(3);
    });

    it('is empty without a date or timed sessions', () => {
        expect(feedScheduleDays(event(twoDays, null), new Date(0))).toEqual([]);
        expect(feedScheduleDays(event([session('untimed', null)]), new Date(0))).toEqual([]);
    });
});

describe('what a schedule block draws', () => {
    const block = feedModuleSection('schedule', () => 'module');
    const todays = createFeedModeSection('feedSchedule', () => 'today');
    const playlist = feedModuleSection('playlist', () => 'playlist');
    const withModule = (sessions: EventSessionResponseDto[], isAvailable = true) =>
        ({ ...event(sessions), modules: [{ moduleKey: 'schedule', isAvailable }] }) as unknown as EventDetailResponseDto;

    it('is the timeline with sessions, and no card', () => {
        const shown = withModule(twoDays);
        expect(drawsScheduleTimeline(block, shown)).toBe(true);
        expect([block, todays].map((section) => [drawsScheduleCard(section, shown), drawsCard(section, shown)])).toEqual([
            [false, false],
            [false, false],
        ]);
    });

    it('is the card with none', () => {
        const shown = withModule([session('untimed', null)]);
        expect(drawsScheduleTimeline(block, shown)).toBe(false);
        expect([block, todays].every((section) => drawsScheduleCard(section, shown) && drawsCard(section, shown))).toBe(true);
    });

    it("keeps today's card on a block whose module is gone, and on other modules", () => {
        const gone = withModule(twoDays, false);
        expect(drawsScheduleTimeline(block, gone)).toBe(false);
        expect(drawsScheduleCard(block, withModule([], false))).toBe(false);
        expect(drawsScheduleCard(todays, withModule([], false))).toBe(false);
        expect(drawsCard(block, gone)).toBe(true);
        expect(drawsCard(todays, gone)).toBe(false);
        expect(drawsCard(playlist, gone)).toBe(true);
        expect(drawsScheduleCard(playlist, withModule([]))).toBe(false);
    });
});
