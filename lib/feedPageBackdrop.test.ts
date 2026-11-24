import { produce } from 'immer';
import { describe, expect, it } from 'vitest';

import { lightTone, readableOnInk } from '@/lib/contrast';
import { defaultFeedLayout, wallThemeDesign } from '@/lib/feedLayout';
import { FEED_CARD_LIGHTEN, feedBackdropClassName, feedBackdropStyle, feedPageBackdrop } from '@/lib/feedPageBackdrop';
import { SAMPLE_THEME } from '@/lib/invitation/samples';
import type { ThemeDesign } from '@/lib/invitation/theme';

const media = (id: string) => `https://cdn.test/${id}.jpg`;
const themed = { ...defaultFeedLayout(), themeId: 'olive' };

describe('feedPageBackdrop', () => {
    it("is the theme's content background, repeating as the slot says", () => {
        const backdrop = feedPageBackdrop(themed, SAMPLE_THEME, media);
        expect(backdrop).toEqual({
            color: readableOnInk('#efe7ec'),
            image: { desktop: 'https://cdn.test/m-content.jpg', mobile: 'https://cdn.test/m-content.jpg' },
            size: '100% auto',
            repeat: 'repeat-y',
            position: 'center top',
            tiled: false,
            fixed: false,
            cardColor: lightTone(readableOnInk('#efe7ec'), FEED_CARD_LIGHTEN),
        });
    });

    it('tiles a texture at the invitation tile size', () => {
        const texture = { ...SAMPLE_THEME, backgrounds: { ...SAMPLE_THEME.backgrounds, content: { desktop: { mediaId: 'm-t' }, mode: 'texture', stableRepeat: false } } } as ThemeDesign;
        expect(feedPageBackdrop(themed, texture, media)).toMatchObject({
            size: 'var(--smd-bg-tile-size) auto',
            repeat: 'repeat',
            position: 'center top',
            tiled: true,
            fixed: false,
        });
        const repeat = { ...texture, backgrounds: { ...texture.backgrounds, content: { ...texture.backgrounds.content, mode: 'repeat' } } } as ThemeDesign;
        expect(feedPageBackdrop(themed, repeat, media)).toMatchObject({ size: 'var(--smd-bg-tile-size) auto', repeat: 'repeat' });
    });

    it('fixes a cover picture to the screen, filling it, so it never repeats into a seam', () => {
        const cover = { ...SAMPLE_THEME, backgrounds: { ...SAMPLE_THEME.backgrounds, content: { desktop: { mediaId: 'm-c' }, mode: 'cover', stableRepeat: false } } } as ThemeDesign;
        expect(feedPageBackdrop(themed, cover, media)).toMatchObject({ size: 'cover', repeat: 'no-repeat', position: 'center', tiled: false, fixed: true });
    });

    it('keeps a stable repeat running down the page at full width, whatever its mode', () => {
        const stable = { ...SAMPLE_THEME, backgrounds: { ...SAMPLE_THEME.backgrounds, content: { desktop: { mediaId: 'm-c' }, mode: 'cover', stableRepeat: true } } } as ThemeDesign;
        expect(feedPageBackdrop(themed, stable, media)).toMatchObject({ size: '100% auto', repeat: 'repeat-y', fixed: false });
    });

    it('is the secondary colour alone when the slot has no image', () => {
        const plain = { ...SAMPLE_THEME, backgrounds: { ...SAMPLE_THEME.backgrounds, content: { mode: 'cover', stableRepeat: false } } } as ThemeDesign;
        expect(feedPageBackdrop(themed, plain, media)).toMatchObject({ color: readableOnInk('#efe7ec'), image: null });
    });

    it("uses the mobile image on both widths when there's only that one", () => {
        const mobileOnly = { ...SAMPLE_THEME, backgrounds: { ...SAMPLE_THEME.backgrounds, content: { mobile: { mediaId: 'm-m' }, mode: 'repeat', stableRepeat: false } } } as ThemeDesign;
        expect(feedPageBackdrop(themed, mobileOnly, media)?.image).toEqual({ desktop: 'https://cdn.test/m-m.jpg', mobile: 'https://cdn.test/m-m.jpg' });
    });

    it('is null on the wall theme, and when the host picked a background colour', () => {
        expect(feedPageBackdrop(defaultFeedLayout(), wallThemeDesign(null), media)).toBeNull();
        const coloured = produce(themed, (draft) => {
            draft.overrides.backgroundColor = '#F5E6D3';
        });
        expect(feedPageBackdrop(coloured, SAMPLE_THEME, media)).toBeNull();
    });
});

describe('feedBackdropClassName', () => {
    it('marks a page whose picture is fixed to the screen, and nothing without a backdrop', () => {
        const cover = { ...SAMPLE_THEME, backgrounds: { ...SAMPLE_THEME.backgrounds, content: { desktop: { mediaId: 'm-c' }, mode: 'cover', stableRepeat: false } } } as ThemeDesign;
        expect(feedBackdropClassName(feedPageBackdrop(themed, cover, media))).toBe('feed-backdrop feed-backdrop--fixed');
        expect(feedBackdropClassName(feedPageBackdrop(themed, SAMPLE_THEME, media))).toBe('feed-backdrop');
        expect(feedBackdropClassName(null)).toBeUndefined();
    });
});

describe('feedBackdropStyle', () => {
    it('hands the images and their presentation to the page as variables', () => {
        const backdrop = feedPageBackdrop(themed, SAMPLE_THEME, media);
        expect(feedBackdropStyle(backdrop)).toEqual({
            '--feed-backdrop-desktop': 'url("https://cdn.test/m-content.jpg")',
            '--feed-backdrop-mobile': 'url("https://cdn.test/m-content.jpg")',
            '--feed-backdrop-size': '100% auto',
            '--feed-backdrop-repeat': 'repeat-y',
            '--feed-backdrop-position': 'center top',
            '--feed-backdrop-tiled': 0,
        });
    });

    it('sets no image without one, and nothing without a backdrop', () => {
        const plain = { ...SAMPLE_THEME, backgrounds: { ...SAMPLE_THEME.backgrounds, content: { mode: 'cover', stableRepeat: false } } } as ThemeDesign;
        expect(feedBackdropStyle(feedPageBackdrop(themed, plain, media))).toMatchObject({ '--feed-backdrop-desktop': 'none', '--feed-backdrop-mobile': 'none' });
        expect(feedBackdropStyle(null)).toBeUndefined();
    });
});
