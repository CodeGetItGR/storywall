import { beforeEach, describe, expect, it } from 'vitest';

import type { MediaResponseDto } from '@/lib/api/types';
import { buildFixtureSnapshot } from '@/lib/demo/__fixtures__/demoSnapshot';
import { createDemoDb, demoContentVersion, keepStoriesLive, swapMediaUrls } from '@/lib/demo/demoDb';
import { groupStoriesByAuthor } from '@/lib/stories';

describe('demo store', () => {
    beforeEach(() => localStorage.clear());

    it('swaps presigned URLs by media id everywhere media is embedded', () => {
        const snapshot = buildFixtureSnapshot();
        const db = createDemoDb('WEDDING', snapshot, 'v1');
        const fresh = snapshot.media.map((m) => ({
            ...m,
            mediaUrl: m.mediaUrl!.replace('old', 'new'),
            thumbnailUrl: 'https://storage.test/t?sig=new',
        }));

        swapMediaUrls(db, { media: fresh, members: snapshot.members });

        expect(db.get('media', 'med-1')?.mediaUrl).toContain('sig=new');
        expect(db.get('posts', 'post-1')?.media[0].mediaUrl).toContain('sig=new');
        expect(db.get('events', snapshot.event.id)?.coverMedia?.mediaUrl).toContain('sig=new');
    });

    it('swaps persona picture URLs on members and every author by member id', () => {
        const snapshot = buildFixtureSnapshot();
        const db = createDemoDb('WEDDING', snapshot, 'v1');
        const hostId = snapshot.members[0].id;
        db.update('posts', 'post-1', (p) => ({ ...p, recentComments: snapshot.comments }));
        const visitor = { ...snapshot.members[0], id: 'demo-member-visitor', avatarUrl: null };
        db.create('members', visitor);
        const fresh = { media: snapshot.media, members: [{ ...snapshot.members[0], avatarUrl: 'https://storage.test/a?sig=new' }] };

        swapMediaUrls(db, fresh);

        const url = 'https://storage.test/a?sig=new';
        expect(db.get('members', hostId)?.avatarUrl).toBe(url);
        expect(db.get('posts', 'post-1')?.author?.avatarUrl).toBe(url);
        expect(db.get('posts', 'post-1')?.recentComments[0].author?.avatarUrl).toBe(url);
        expect(db.get('comments', 'cmt-1')?.author?.avatarUrl).toBe(url);
        expect(db.get('stories', 'story-1')?.author?.avatarUrl).toBe(url);
        // A member the visitor added isn't in the snapshot, so it is left alone.
        expect(db.get('members', 'demo-member-visitor')?.avatarUrl).toBeNull();
    });

    it('clears a picture the admin removed', () => {
        const snapshot = buildFixtureSnapshot();
        const withPicture = { ...snapshot.members[0], avatarUrl: 'https://storage.test/a?sig=old' };
        const db = createDemoDb('WEDDING', { ...snapshot, members: [withPicture] }, 'v1');

        swapMediaUrls(db, { media: snapshot.media, members: [{ ...withPicture, avatarUrl: null }] });

        expect(db.get('members', withPicture.id)?.avatarUrl).toBeNull();
    });

    it('keeps the visitor’s changes across reloads but drops uploads that only lived in the page', () => {
        const snapshot = buildFixtureSnapshot();
        const db = createDemoDb('WEDDING', snapshot, 'v1');
        const upload = { ...snapshot.media[1], id: 'local-1', mediaUrl: 'blob:http://localhost/abc' } as MediaResponseDto;
        db.create('media', upload);
        db.update('posts', 'post-1', (p) => ({ ...p, content: 'Edited', media: [...p.media, upload] }));

        const reloaded = createDemoDb('WEDDING', snapshot, 'v1');

        expect(reloaded.get('posts', 'post-1')?.content).toBe('Edited');
        expect(reloaded.get('media', 'local-1')).toBeUndefined();
        expect(reloaded.get('posts', 'post-1')?.media.map((m) => m.id)).toEqual(['med-1']);
    });

    describe('keepStoriesLive', () => {
        const HOUR = 3_600_000;
        const now = new Date('2026-04-20T12:00:00.000Z');
        const at = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * HOUR).toISOString();

        function dbWithStories(stories: { id: string; hoursAgo: number }[]) {
            const snapshot = buildFixtureSnapshot();
            const template = snapshot.stories[0];
            const db = createDemoDb(
                'WEDDING',
                {
                    ...snapshot,
                    stories: stories.map(({ id, hoursAgo }) => ({
                        ...template,
                        id,
                        createdAt: at(hoursAgo),
                        expiresAt: at(hoursAgo - 24),
                    })),
                },
                'v1',
            );
            return db;
        }

        it('brings back stories posted more than a day ago, oldest still first', () => {
            // Posted 3 days, 30 hours and 2 hours before now: the first two have expired.
            const db = dbWithStories([
                { id: 's-old', hoursAgo: 72 },
                { id: 's-mid', hoursAgo: 30 },
                { id: 's-new', hoursAgo: 2 },
            ]);

            keepStoriesLive(db, now);

            const stories = db.list('stories');
            expect(groupStoriesByAuthor(stories, { now })[0].stories.map((s) => s.id)).toEqual(['s-old', 's-mid', 's-new']);
            for (const story of stories) {
                expect(Date.parse(story.createdAt)).toBeLessThanOrEqual(now.getTime());
                expect(Date.parse(story.createdAt)).toBeGreaterThanOrEqual(now.getTime() - 12 * HOUR);
                expect(Date.parse(story.expiresAt) - Date.parse(story.createdAt)).toBe(24 * HOUR);
            }
        });

        it('keeps them live on a saved demo the visitor reopens days later', () => {
            dbWithStories([{ id: 's-1', hoursAgo: 1 }]);
            const reopened = createDemoDb('WEDDING', buildFixtureSnapshot(), 'v1');
            const later = new Date(now.getTime() + 5 * 24 * HOUR);

            keepStoriesLive(reopened, later);

            expect(groupStoriesByAuthor(reopened.list('stories'), { now: later })).toHaveLength(1);
        });

        it('leaves recent stories where they are', () => {
            const db = dbWithStories([
                { id: 's-a', hoursAgo: 5 },
                { id: 's-b', hoursAgo: 1 },
            ]);

            keepStoriesLive(db, now);

            expect(db.get('stories', 's-a')?.createdAt).toBe(at(5));
            expect(db.get('stories', 's-b')?.expiresAt).toBe(at(-23));
        });
    });

    it('keeps each event type separate', () => {
        const snapshot = buildFixtureSnapshot();
        createDemoDb('WEDDING', snapshot, 'v1').update('posts', 'post-1', (p) => ({ ...p, content: 'Edited' }));
        expect(createDemoDb('BIRTHDAY', snapshot, 'v1').get('posts', 'post-1')?.content).toBe('Hello');
    });

    it('starts over when the demo content changed since the visitor saved it', () => {
        const snapshot = buildFixtureSnapshot();
        createDemoDb('WEDDING', snapshot, 'v1').update('posts', 'post-1', (p) => ({ ...p, content: 'Edited' }));
        expect(createDemoDb('WEDDING', snapshot, 'v2').get('posts', 'post-1')?.content).toBe('Hello');
    });

    it('versions the content, not its presigned URLs or build time', () => {
        const snapshot = buildFixtureSnapshot();
        const refreshed = {
            ...snapshot,
            snapshotAt: '2030-01-01T00:00:00Z',
            presignedUrlsValidUntil: '2030-01-01T01:00:00Z',
            media: snapshot.media.map((m) => ({ ...m, mediaUrl: 'https://storage.test/m?sig=new', thumbnailUrl: 'https://storage.test/t?sig=new' })),
            members: snapshot.members.map((m) => ({ ...m, avatarUrl: 'https://storage.test/a?sig=new' })),
        };
        const edited = { ...snapshot, posts: snapshot.posts.map((p) => ({ ...p, content: 'Changed by the admin' })) };

        expect(demoContentVersion(refreshed)).toBe(demoContentVersion(snapshot));
        expect(demoContentVersion(edited)).not.toBe(demoContentVersion(snapshot));
        expect(demoContentVersion({ ...snapshot, event: { ...snapshot.event, id: 'another-event' } })).not.toBe(demoContentVersion(snapshot));
    });
});
