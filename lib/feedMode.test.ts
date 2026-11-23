import { describe, expect, it } from 'vitest';

import type { EventDetailResponseDto } from '@/lib/api/types';
import { eventDayOf, openingFeedMode, parseFeedModeParam, readFeedModePick, todayFor, withViewParam } from '@/lib/feedMode';

const athens = (startAt: string | null) =>
    ({ schedule: { startAt, timezone: 'Europe/Athens' }, sessions: [] }) as unknown as Pick<EventDetailResponseDto, 'schedule' | 'sessions'>;

describe('openingFeedMode', () => {
    const eventDay = '2026-12-20';

    it('opens Invitation before the event day and Feed from it on (rules 1 and 2)', () => {
        expect(openingFeedMode({ today: '2026-12-19', eventDay, pick: null, param: null })).toEqual({ mode: 'invitation', save: null });
        expect(openingFeedMode({ today: '2026-12-20', eventDay, pick: null, param: null })).toEqual({ mode: 'feed', save: null });
        expect(openingFeedMode({ today: '2027-01-05', eventDay, pick: null, param: null })).toEqual({ mode: 'feed', save: null });
    });

    it('uses the last pick (rule 3)', () => {
        expect(openingFeedMode({ today: '2026-12-01', eventDay, pick: { mode: 'feed', savedDay: '2026-11-30' }, param: null })).toEqual({ mode: 'feed', save: null });
    });

    it('opens Feed once on the event day whatever was picked before, and records it (rule 4)', () => {
        const before = { mode: 'invitation' as const, savedDay: '2026-12-18' };
        expect(openingFeedMode({ today: '2026-12-20', eventDay, pick: before, param: null })).toEqual({
            mode: 'feed',
            save: { mode: 'feed', savedDay: '2026-12-20' },
        });
        const pickedThatDay = { mode: 'invitation' as const, savedDay: '2026-12-20' };
        expect(openingFeedMode({ today: '2026-12-20', eventDay, pick: pickedThatDay, param: null })).toEqual({ mode: 'invitation', save: null });
    });

    it('keeps an Invitation pick made after the event (rule 5)', () => {
        expect(openingFeedMode({ today: '2027-01-02', eventDay, pick: { mode: 'invitation', savedDay: '2026-12-28' }, param: null })).toEqual({
            mode: 'invitation',
            save: null,
        });
    });

    it('opens the mode a link asks for and saves it as the pick', () => {
        expect(openingFeedMode({ today: '2026-12-01', eventDay, pick: null, param: 'feed' })).toEqual({
            mode: 'feed',
            save: { mode: 'feed', savedDay: '2026-12-01' },
        });
        expect(openingFeedMode({ today: '2026-12-01', eventDay, pick: { mode: 'feed', savedDay: '2026-12-01' }, param: 'feed' })).toEqual({
            mode: 'feed',
            save: null,
        });
    });

    it('always opens Invitation for an event without a date, unless picked', () => {
        expect(openingFeedMode({ today: '2026-12-01', eventDay: null, pick: null, param: null }).mode).toBe('invitation');
        expect(openingFeedMode({ today: '2026-12-01', eventDay: null, pick: { mode: 'feed', savedDay: '2026-11-01' }, param: null }).mode).toBe('feed');
    });
});

describe('days in the event time zone', () => {
    it("counts the event day and today in the event's time zone, not the viewer's", () => {
        // 23:30 UTC on the 19th is already the 20th in Athens.
        expect(eventDayOf(athens('2026-12-19T23:30:00Z'))).toBe('2026-12-20');
        expect(todayFor(athens(null), Date.parse('2026-12-19T22:30:00Z'))).toBe('2026-12-20');
        expect(eventDayOf(athens(null))).toBeNull();
    });
});

describe('the stored pick and the view param', () => {
    it('reads a stored pick and drops anything else', () => {
        expect(readFeedModePick('{"mode":"feed","savedDay":"2026-12-01"}')).toEqual({ mode: 'feed', savedDay: '2026-12-01' });
        expect(readFeedModePick('{"mode":"wall","savedDay":"2026-12-01"}')).toBeNull();
        expect(readFeedModePick('{"mode":"feed","savedDay":"yesterday"}')).toBeNull();
        expect(readFeedModePick('not json')).toBeNull();
        expect(readFeedModePick(null)).toBeNull();
    });

    it('reads ?view= and writes it next to the other params', () => {
        expect(parseFeedModeParam('invitation')).toBe('invitation');
        expect(parseFeedModeParam('posts')).toBeNull();
        expect(withViewParam('/events/e-1/feed', '?post=p-1', 'feed')).toBe('/events/e-1/feed?post=p-1&view=feed');
        expect(withViewParam('/events/e-1/feed', '?view=feed', 'invitation')).toBe('/events/e-1/feed?view=invitation');
    });
});
