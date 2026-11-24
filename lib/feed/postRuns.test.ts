import { describe, expect, it } from 'vitest';

import type { PostResponseDto } from '@/lib/api/types';
import type { FeedItem } from '@/lib/feed/partnerBranding';
import { withPostRuns } from '@/lib/feed/postRuns';

const item = (kind: string, index: number): FeedItem => {
    if (kind === 'partner') return { kind: 'partner', key: `partner-${index}` };
    const type = kind === 'digest' ? 'PLAYLIST' : kind === 'announcement' ? 'ANNOUNCEMENT' : 'TEXT';
    const author = kind === 'digest' ? null : { memberId: 'm1' };
    return { kind: 'post', index, post: { id: `post-${index}`, type, author } as PostResponseDto };
};

// 's' starts a run, 'e' ends one, 'se' is a lone post, '-' sits inside a run, the rest are the other cards.
function runs(...kinds: string[]) {
    return withPostRuns(kinds.map(item)).map((each, index) => {
        if (each.kind === 'partner' || kinds[index] === 'digest') return kinds[index];
        return `${each.startsRun ? 's' : ''}${each.endsRun ? 'e' : ''}` || '-';
    });
}

describe('withPostRuns', () => {
    it('has nothing to round in an empty feed', () => {
        expect(runs()).toEqual([]);
    });

    it('rounds only the first and last post of one run', () => {
        expect(runs('post', 'post', 'post')).toEqual(['s', '-', 'e']);
    });

    it('gives a lone post both ends', () => {
        expect(runs('post')).toEqual(['se']);
    });

    it('breaks a run at a partner card', () => {
        expect(runs('post', 'post', 'partner', 'post', 'post')).toEqual(['s', 'e', 'partner', 's', 'e']);
    });

    it('breaks a run at a playlist digest, which is a post but drawn as its own card', () => {
        expect(runs('post', 'post', 'digest', 'post')).toEqual(['s', 'e', 'digest', 'se']);
    });

    it('starts after a digest that opens the feed and ends before one that closes it', () => {
        expect(runs('digest', 'post', 'post', 'digest')).toEqual(['digest', 's', 'e', 'digest']);
    });

    it('treats neighbouring cards as one break', () => {
        expect(runs('post', 'digest', 'partner', 'post')).toEqual(['se', 'digest', 'partner', 'se']);
    });

    it('never marks a digest as an end of a run', () => {
        expect(withPostRuns([item('digest', 0)])[0]).toMatchObject({ startsRun: false, endsRun: false });
    });

    it('keeps an announcement in the run, since it is drawn as a post', () => {
        expect(runs('announcement', 'post')).toEqual(['s', 'e']);
    });

    it('keeps a playlist post written by a member in the run', () => {
        const member = { kind: 'post', index: 0, post: { id: 'p', type: 'PLAYLIST', author: { memberId: 'm1' } } } as FeedItem;
        expect(withPostRuns([member, item('post', 1)])[0]).toMatchObject({ startsRun: true, endsRun: false });
    });

    it('moves the end when more posts load', () => {
        expect(runs('post', 'post')).toEqual(['s', 'e']);
        expect(runs('post', 'post', 'post', 'post')).toEqual(['s', '-', '-', 'e']);
    });

    it('keeps the items in order', () => {
        const items = ['post', 'partner', 'digest'].map(item);
        expect(withPostRuns(items)).toMatchObject(items);
    });
});
