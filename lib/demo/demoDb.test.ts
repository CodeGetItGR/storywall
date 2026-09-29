import { beforeEach, describe, expect, it } from 'vitest';

import type { MediaResponseDto } from '@/lib/api/types';
import { buildFixtureSnapshot } from '@/lib/demo/__fixtures__/demoSnapshot';
import { createDemoDb, swapMediaUrls } from '@/lib/demo/demoDb';

describe('demo store', () => {
    beforeEach(() => localStorage.clear());

    it('swaps presigned URLs by media id everywhere media is embedded', () => {
        const snapshot = buildFixtureSnapshot();
        const db = createDemoDb('WEDDING', snapshot);
        const fresh = snapshot.media.map((m) => ({ ...m, mediaUrl: m.mediaUrl.replace('old', 'new'), thumbnailUrl: 'https://storage.test/t?sig=new' }));

        swapMediaUrls(db, fresh);

        expect(db.get('media', 'med-1')?.mediaUrl).toContain('sig=new');
        expect(db.get('posts', 'post-1')?.media[0].mediaUrl).toContain('sig=new');
        expect(db.get('events', snapshot.event.id)?.coverMedia?.mediaUrl).toContain('sig=new');
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
