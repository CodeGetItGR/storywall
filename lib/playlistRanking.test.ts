import { describe, expect, it } from 'vitest';

import { splitPlaylistLiveRows } from '@/lib/playlistRanking';

describe('splitPlaylistLiveRows', () => {
    it('keeps the rank order for songs to play and puts the latest played first', () => {
        const rows = [
            { id: 'a', playedAt: null },
            { id: 'b', playedAt: '2027-07-12T21:00:00Z' },
            { id: 'c' },
            { id: 'd', playedAt: '2027-07-12T22:00:00Z' },
        ];

        const { upNext, played } = splitPlaylistLiveRows(rows);

        expect(upNext.map((row) => row.id)).toEqual(['a', 'c']);
        expect(played.map((row) => row.id)).toEqual(['d', 'b']);
    });
});
