import { describe, expect, it } from 'vitest';

import { feedEditHref, isFeedEditRequest, withoutEditParam } from '@/lib/feedEditLink';

describe('feedEditLink', () => {
    it('links to the feed in edit mode', () => {
        expect(feedEditHref('e-1')).toBe('/events/e-1/feed?edit=blocks');
    });

    it('reads the request', () => {
        expect(isFeedEditRequest(new URLSearchParams('edit=blocks'))).toBe(true);
        expect(isFeedEditRequest(new URLSearchParams('edit=other'))).toBe(false);
        expect(isFeedEditRequest(new URLSearchParams(''))).toBe(false);
    });

    it('drops only the edit param', () => {
        expect(withoutEditParam('/events/e-1/feed', 'edit=blocks')).toBe('/events/e-1/feed');
        expect(withoutEditParam('/events/e-1/feed', 'post=p-1&edit=blocks')).toBe('/events/e-1/feed?post=p-1');
    });
});
