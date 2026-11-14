import { describe, expect, it } from 'vitest';

import {
    activeDays,
    contributedShare,
    dailySeries,
    defaultDay,
    hourlyForDay,
    hourOfDayHeatmap,
    localDay,
    reactionsSummary,
    removedKinds,
    removedTotal,
    shiftDay,
    topKind,
    topPeaks,
    wallClockDate,
} from '@/lib/adminEventActivity';
import type { AdminEventActivityHour } from '@/lib/api/types';

const h = (hour: string, posts = 0, stories = 0, gallery = 0, wishes = 0): AdminEventActivityHour => ({ hour, posts, stories, gallery, wishes });

const HOURS = [
    h('2026-06-13T20:00', 1),
    h('2026-06-14T18:00', 2, 1),
    h('2026-06-14T21:00', 4, 0, 3),
    h('2026-06-14T23:00', 6, 2, 9, 3),
    h('2026-06-16T10:00', 0, 0, 1),
];

describe('activeDays', () => {
    it('lists each day with activity once, in order', () => {
        expect(activeDays(HOURS)).toEqual(['2026-06-13', '2026-06-14', '2026-06-16']);
    });
});

describe('localDay', () => {
    it('reads the calendar day in the event time zone', () => {
        expect(localDay('2026-06-14T22:30:00Z', 'Europe/Athens')).toBe('2026-06-15');
        expect(localDay('2026-06-14T20:30:00Z', 'Europe/Athens')).toBe('2026-06-14');
    });
});

describe('defaultDay', () => {
    it('opens on the start day when it had activity', () => {
        expect(defaultDay(HOURS, '2026-06-14T13:00:00Z', 'Europe/Athens')).toBe('2026-06-14');
    });
    it('falls back to the busiest day', () => {
        expect(defaultDay(HOURS, '2026-07-01T13:00:00Z', 'Europe/Athens')).toBe('2026-06-14');
        expect(defaultDay(HOURS, null, 'Europe/Athens')).toBe('2026-06-14');
    });
    it('is null without activity', () => {
        expect(defaultDay([], null, 'Europe/Athens')).toBeNull();
    });
});

describe('shiftDay', () => {
    it('steps through active days only', () => {
        const days = activeDays(HOURS);
        expect(shiftDay(days, '2026-06-14', 1)).toBe('2026-06-16');
        expect(shiftDay(days, '2026-06-14', -1)).toBe('2026-06-13');
        expect(shiftDay(days, '2026-06-16', 1)).toBeNull();
    });
});

describe('hourlyForDay', () => {
    it('trims to the first and last active hour and fills the gaps with zero', () => {
        const columns = hourlyForDay(HOURS, '2026-06-14');
        expect(columns.map((c) => c.hour)).toEqual([18, 19, 20, 21, 22, 23]);
        expect(columns[1]).toMatchObject({ posts: 0, total: 0 });
        expect(columns[5]).toMatchObject({ posts: 6, stories: 2, gallery: 9, wishes: 3, total: 20, label: '23:00' });
    });
    it('is empty for a day without activity', () => {
        expect(hourlyForDay(HOURS, '2026-06-15')).toEqual([]);
    });
});

describe('dailySeries', () => {
    it('covers first to last active day with zero-filled gaps', () => {
        const days = dailySeries(HOURS);
        expect(days.map((d) => d.day)).toEqual(['2026-06-13', '2026-06-14', '2026-06-15', '2026-06-16']);
        expect(days[1].total).toBe(30);
        expect(days[2].total).toBe(0);
    });
    it('folds days before the cap into one earlier column', () => {
        const days = dailySeries(HOURS, 2);
        expect(days.map((d) => d.day)).toEqual(['earlier', '2026-06-15', '2026-06-16']);
        expect(days[0]).toMatchObject({ earlier: true, total: 31 });
    });
});

describe('hourOfDayHeatmap', () => {
    it('sums each kind per hour of the day across all days', () => {
        const map = hourOfDayHeatmap(HOURS);
        expect(map.posts[23]).toBe(6);
        expect(map.posts[20]).toBe(1);
        expect(map.gallery[10]).toBe(1);
        expect(map.wishes).toHaveLength(24);
    });
});

describe('topPeaks', () => {
    it('ranks the busiest hours, earlier first on a tie', () => {
        expect(topPeaks(HOURS, 3).map((p) => [p.hour, p.total])).toEqual([
            ['2026-06-14T23:00', 20],
            ['2026-06-14T21:00', 7],
            ['2026-06-14T18:00', 3],
        ]);
    });
});

describe('contributedShare and removedTotal', () => {
    it('is null with no members', () => {
        expect(contributedShare({ total: 0, contributed: 0 })).toBeNull();
        expect(contributedShare({ total: 4, contributed: 1 })).toBe(0.25);
    });
    it('adds every removed kind', () => {
        expect(removedTotal({ posts: 1, stories: 2, galleryUploads: 3, comments: 4, wishes: 5 })).toBe(15);
    });
    it('lists only the removed kinds above zero, in a fixed order', () => {
        expect(removedKinds({ posts: 2, stories: 0, galleryUploads: 1, comments: 0, wishes: 3 })).toEqual(['posts', 'galleryUploads', 'wishes']);
        expect(removedKinds({ posts: 0, stories: 0, galleryUploads: 0, comments: 0, wishes: 0 })).toEqual([]);
    });
});

describe('topKind', () => {
    it('is the last kind in the stack with a count', () => {
        expect(topKind({ posts: 3, stories: 1, gallery: 2, wishes: 0 })).toBe('gallery');
        expect(topKind({ posts: 3, stories: 0, gallery: 0, wishes: 1 })).toBe('wishes');
    });
    it('is null for an empty column', () => {
        expect(topKind({ posts: 0, stories: 0, gallery: 0, wishes: 0 })).toBeNull();
    });
});

describe('reactionsSummary', () => {
    it('joins each reaction with its count, falling back to the code', () => {
        const summary = reactionsSummary(
            [
                { code: 'HEART', emoji: '❤️', count: 1200 },
                { code: 'CLAP', emoji: null, count: 3 },
            ],
            (value) => `#${value}`,
        );
        expect(summary).toBe('❤️ #1200  CLAP #3');
    });
    it('is empty with no reactions', () => {
        expect(reactionsSummary([], String)).toBe('');
    });
});

describe('edge cases', () => {
    const tied = [h('2026-06-15T10:00', 5), h('2026-06-14T10:00', 5)];
    it('picks the earlier day and hour on a tie', () => {
        expect(defaultDay(tied, null, 'Europe/Athens')).toBe('2026-06-14');
        expect(topPeaks(tied, 2).map((p) => p.hour)).toEqual(['2026-06-14T10:00', '2026-06-15T10:00']);
    });
    it('keeps the day series continuous across a year end', () => {
        const days = dailySeries([h('2025-12-30T10:00', 1), h('2026-01-02T10:00', 1)]);
        expect(days.map((d) => d.day)).toEqual(['2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02']);
    });
    it('handles a single hour', () => {
        expect(hourlyForDay([h('2026-06-14T21:00', 2)], '2026-06-14').map((c) => c.hour)).toEqual([21]);
    });
    it('reads the local day in the event time zone', () => {
        expect(localDay('2026-12-31T22:30:00Z', 'Europe/Athens')).toBe('2027-01-01');
    });
    it('turns a wall-clock hour into the same UTC time', () => {
        expect(wallClockDate('2026-06-14T23:00').toISOString()).toBe('2026-06-14T23:00:00.000Z');
        expect(wallClockDate('2026-06-14').toISOString()).toBe('2026-06-14T00:00:00.000Z');
    });
});
