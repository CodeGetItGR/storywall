import { describe, expect, it } from 'vitest';

import { buildFixtureSnapshot } from '@/lib/demo/__fixtures__/demoSnapshot';
import { rebaseSnapshot } from '@/lib/demo/snapshotRebase';

const HOUR = 3_600_000;

describe('rebaseSnapshot', () => {
    const snapshot = buildFixtureSnapshot();
    // 100 days after snapshotAt (2026-01-10T12:00:00Z).
    const now = new Date('2026-04-20T12:00:00.000Z');
    const rebased = rebaseSnapshot(snapshot, now);

    function age(iso: string, reference: string | Date): number {
        return new Date(reference).getTime() - Date.parse(iso);
    }

    it('keeps each timestamp at the same distance from "now" as it was from snapshotAt', () => {
        expect(age(snapshot.posts[0].createdAt, snapshot.snapshotAt)).toBe(2 * HOUR);
        expect(age(rebased.posts[0].createdAt, now)).toBe(2 * HOUR);
        expect(rebased.posts[0].createdAt).toBe('2026-04-20T10:00:00.000Z');
    });

    it('shifts nested timestamps (comments, embedded media, event schedule, cover media)', () => {
        expect(rebased.comments[0].createdAt).toBe('2026-04-20T11:00:00.000Z');
        expect(rebased.posts[0].media[0].createdAt).toBe('2026-04-20T10:00:00.000Z');
        expect(rebased.event.schedule.startAt).toBe('2026-05-04T15:00:00.000Z');
        expect(rebased.event.coverMedia?.createdAt).toBe('2026-04-20T10:00:00.000Z');
        expect(rebased.members[0].joinedAt).toBe('2026-04-11T09:00:00.000Z');
    });

    it('makes a story that was live at snapshot time live now', () => {
        const story = rebased.stories[0];
        expect(Date.parse(story.createdAt)).toBeLessThan(now.getTime());
        expect(Date.parse(story.expiresAt)).toBeGreaterThan(now.getTime());
        expect(story.expiresAt).toBe('2026-04-21T11:00:00.000Z');
    });

    it('leaves snapshotAt, presignedUrlsValidUntil, nulls and non-date strings alone', () => {
        expect(rebased.snapshotAt).toBe(snapshot.snapshotAt);
        expect(rebased.presignedUrlsValidUntil).toBe(snapshot.presignedUrlsValidUntil);
        expect(rebased.posts[0].deletedAt).toBeNull();
        expect(rebased.posts[0].content).toBe('Hello');
        expect(rebased.media[0].mediaUrl).toBe(snapshot.media[0].mediaUrl);
        expect(rebased.event.id).toBe(snapshot.event.id);
    });

    it('does not mutate the input', () => {
        expect(buildFixtureSnapshot()).toEqual(snapshot);
    });
});
