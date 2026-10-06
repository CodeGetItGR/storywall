import { describe, expect, it } from 'vitest';

import { isFeedRoute } from './utils';

describe('isFeedRoute', () => {
    it('matches the event feed and the demo feed', () => {
        expect(isFeedRoute('/events/abc/feed')).toBe(true);
        expect(isFeedRoute('/demo/wedding/feed')).toBe(true);
    });

    it('does not match other event pages', () => {
        expect(isFeedRoute('/events/abc/tools/playlist')).toBe(false);
        expect(isFeedRoute('/demo/wedding/tools/playlist')).toBe(false);
    });
});
