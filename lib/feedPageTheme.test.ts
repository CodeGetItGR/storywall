import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EventThemeDto } from '@/lib/api/types';
import { feedPageTheme, feedPageThemeFor, feedPageThemeSnapshot, publishFeedPageTheme, subscribeFeedPageTheme } from '@/lib/feedPageTheme';

const dino: EventThemeDto = {
    presetKey: 'dino-mint',
    backgroundColor: '#BFE6E2',
    illustrationUrl: 'https://media.example/dino.webp',
    titleColor: null,
    headingFont: null,
};

afterEach(() => {
    publishFeedPageTheme('feed', null);
    publishFeedPageTheme('edit', null);
});

describe('feedPageTheme', () => {
    it('is the wall theme without a background colour', () => {
        expect(feedPageTheme(dino, null)).toEqual({ theme: dino });
        expect(feedPageTheme(null, undefined)).toEqual({ theme: null });
    });

    it('puts the readable background colour on the wall theme, or on no theme', () => {
        expect(feedPageTheme(dino, '#F5E6D3').theme).toEqual({ ...dino, backgroundColor: '#F5E6D3' });
        expect(feedPageTheme(null, '#F5E6D3').theme?.backgroundColor).toBe('#F5E6D3');
        expect(feedPageTheme(null, '#000000').theme?.backgroundColor).not.toBe('#000000');
    });
});

describe('the published override', () => {
    it('is for its own event, and edit mode wins', () => {
        publishFeedPageTheme('feed', { eventId: 'e-1', value: { theme: dino } });
        expect(feedPageThemeFor(feedPageThemeSnapshot(), 'e-1')).toEqual({ theme: dino });
        expect(feedPageThemeFor(feedPageThemeSnapshot(), 'e-2')).toBeNull();
        publishFeedPageTheme('edit', { eventId: 'e-1', value: { theme: null } });
        expect(feedPageThemeFor(feedPageThemeSnapshot(), 'e-1')).toEqual({ theme: null });
    });

    it('tells listeners only about real changes', () => {
        const listener = vi.fn();
        const stop = subscribeFeedPageTheme(listener);
        publishFeedPageTheme('feed', { eventId: 'e-1', value: { theme: dino } });
        publishFeedPageTheme('feed', { eventId: 'e-1', value: { theme: { ...dino } } });
        expect(listener).toHaveBeenCalledOnce();
        stop();
    });
});
