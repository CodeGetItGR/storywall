import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EventThemeDto } from '@/lib/api/types';
import { tooDarkForInk } from '@/lib/contrast';
import type { FeedPageBackdrop } from '@/lib/feedPageBackdrop';
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

    it('puts the background colour on the wall theme, or on no theme', () => {
        expect(feedPageTheme(dino, '#F5E6D3').theme).toEqual({ ...dino, backgroundColor: '#F5E6D3' });
        expect(feedPageTheme(null, '#F5E6D3').theme?.backgroundColor).toBe('#F5E6D3');
        expect(feedPageTheme(null, '#F5E6D3')).not.toHaveProperty('tone');
        expect(feedPageTheme(null, '#F5E6D3')).not.toHaveProperty('cardColor');
    });

    it('keeps a dark colour dark, with light text and light cards', () => {
        const page = feedPageTheme(dino, '#1B2A4A');
        expect(page.theme?.backgroundColor).toBe('#1B2A4A');
        expect(page.tone).toMatchObject({ text: 'light', ink: '#FFFFFF' });
        expect(tooDarkForInk(page.cardColor!)).toBe(false);
    });

    it("keeps the preset's title colour when it reads on the background colour", () => {
        const titled = { ...dino, titleColor: '#7A1F3D' };
        expect(feedPageTheme(titled, '#F5E6D3').theme?.titleColor).toBe('#7A1F3D');
    });

    it("drops the preset's title colour to ink when it can't be read on the background colour", () => {
        const titled = { ...dino, titleColor: '#F0E0D0' };
        expect(feedPageTheme(titled, '#F5E6D3').theme?.titleColor).toBeNull();
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

describe('feedPageTheme with a backdrop', () => {
    const backdrop: FeedPageBackdrop = {
        color: '#EFE7EC',
        image: null,
        size: '100% auto',
        repeat: 'repeat-y',
        position: 'center top',
        tiled: false,
        fixed: false,
        cardColor: '#F9F5F7',
    };
    const wall = { presetKey: 'dino', backgroundColor: '#BFE6E2', illustrationUrl: 'https://media.example/dino.webp', titleColor: null, headingFont: null };

    it('puts the page colour under the wall theme and carries the backdrop', () => {
        expect(feedPageTheme(wall, null, backdrop)).toEqual({ theme: { ...wall, backgroundColor: '#EFE7EC' }, backdrop, cardColor: '#F9F5F7' });
    });

    it('follows how dark the picture is once that is known', () => {
        const image = { desktop: 'd.jpg', mobile: 'm.jpg' };
        expect(feedPageTheme(wall, null, { ...backdrop, image })).not.toHaveProperty('tone');
        const dark = { ...backdrop, image, pictureTone: { mean: 0.03, dark: 0.01, light: 0.08 } };
        expect(feedPageTheme(wall, null, dark).tone?.text).toBe('light');
        const light = { ...backdrop, image, pictureTone: { mean: 0.8, dark: 0.7, light: 0.9 } };
        expect(feedPageTheme(wall, null, light)).not.toHaveProperty('tone');
    });

    it("gives the host's background colour the page instead", () => {
        expect(feedPageTheme(wall, '#F5E6D3', backdrop)).toEqual({ theme: { ...wall, backgroundColor: '#F5E6D3' } });
    });
});
