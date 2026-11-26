import { describe, expect, it } from 'vitest';

import type { PostResponseDto } from '@/lib/api/types';
import { feedEndsWithPost } from '@/lib/feed/feedEnd';
import type { FeedItem } from '@/lib/feed/partnerBranding';

const post = (type: PostResponseDto['type'] = 'TEXT', author: unknown = { memberId: 'm1' }) =>
    ({ kind: 'post', index: 0, post: { id: 'p', type, author } }) as FeedItem;
const digest = post('PLAYLIST', null);
const partner: FeedItem = { kind: 'partner', key: 'partner-1' };

describe('feedEndsWithPost', () => {
    it('is true when the last card is a post', () => {
        expect(feedEndsWithPost([digest, post()], false)).toBe(true);
        expect(feedEndsWithPost([post('ANNOUNCEMENT')], false)).toBe(true);
    });

    it('is false for an empty feed, a playlist digest or a partner card', () => {
        expect(feedEndsWithPost([], false)).toBe(false);
        expect(feedEndsWithPost([post(), digest], false)).toBe(false);
        expect(feedEndsWithPost([post(), partner], false)).toBe(false);
    });

    it('is false while there are more posts to load', () => {
        expect(feedEndsWithPost([post()], true)).toBe(false);
    });
});
