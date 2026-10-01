import { beforeEach, describe, expect, it } from 'vitest';

import type { MediaResponseDto } from '@/lib/api/types';
import { buildFixtureSnapshot } from '@/lib/demo/__fixtures__/demoSnapshot';
import { createDemoDb, swapMediaUrls } from '@/lib/demo/demoDb';

describe('demo store', () => {
    beforeEach(() => localStorage.clear());

    it('swaps presigned URLs by media id everywhere media is embedded', () => {
        const snapshot = buildFixtureSnapshot();
        const db = createDemoDb('WEDDING', snapshot);
        const fresh = snapshot.media.map((m) => ({
            ...m,
            mediaUrl: m.mediaUrl.replace('old', 'new'),
            thumbnailUrl: 'https://storage.test/t?sig=new',
        }));

        swapMediaUrls(db, { media: fresh, members: snapshot.members });

        expect(db.get('media', 'med-1')?.mediaUrl).toContain('sig=new');
        expect(db.get('posts', 'post-1')?.media[0].mediaUrl).toContain('sig=new');
        expect(db.get('events', snapshot.event.id)?.coverMedia?.mediaUrl).toContain('sig=new');
    });

    it('swaps persona picture URLs on members and every author by member id', () => {
        const snapshot = buildFixtureSnapshot();
        const db = createDemoDb('WEDDING', snapshot);
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
        const db = createDemoDb('WEDDING', { ...snapshot, members: [withPicture] });

        swapMediaUrls(db, { media: snapshot.media, members: [{ ...withPicture, avatarUrl: null }] });

        expect(db.get('members', withPicture.id)?.avatarUrl).toBeNull();
    });

    it('keeps the visitor’s changes across reloads but drops uploads that only lived in the page', () => {
        const snapshot = buildFixtureSnapshot();
        const db = createDemoDb('WEDDING', snapshot);
        const upload = { ...snapshot.media[1], id: 'local-1', mediaUrl: 'blob:http://localhost/abc' } as MediaResponseDto;
        db.create('media', upload);
        db.update('posts', 'post-1', (p) => ({ ...p, content: 'Edited', media: [...p.media, upload] }));

        const reloaded = createDemoDb('WEDDING', snapshot);

        expect(reloaded.get('posts', 'post-1')?.content).toBe('Edited');
        expect(reloaded.get('media', 'local-1')).toBeUndefined();
        expect(reloaded.get('posts', 'post-1')?.media.map((m) => m.id)).toEqual(['med-1']);
    });

    it('keeps each event type separate', () => {
        const snapshot = buildFixtureSnapshot();
        createDemoDb('WEDDING', snapshot).update('posts', 'post-1', (p) => ({ ...p, content: 'Edited' }));
        expect(createDemoDb('BIRTHDAY', snapshot).get('posts', 'post-1')?.content).toBe('Hello');
    });
});
