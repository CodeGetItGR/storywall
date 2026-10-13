import { describe, expect, it } from 'vitest';

import type { EventDetailResponseDto } from '@/lib/api/types';
import {
    canPickTheme,
    eventThemeStyle,
    isHexColor,
    isThemedEventPage,
    isThemeFontUrl,
    themeFontFaceCss,
    themeFontScopeProps,
} from '@/lib/eventTheme';

describe('isHexColor', () => {
    it('accepts #RRGGBB in either case', () => {
        expect(isHexColor('#BFE6E2')).toBe(true);
        expect(isHexColor('#bfe6e2')).toBe(true);
    });

    it('rejects everything else', () => {
        expect(isHexColor('#FFF')).toBe(false);
        expect(isHexColor('BFE6E2')).toBe(false);
        expect(isHexColor('red')).toBe(false);
        expect(isHexColor('#BFE6E2;color:red')).toBe(false);
        expect(isHexColor('')).toBe(false);
    });
});

describe('eventThemeStyle', () => {
    it('sets the colour tokens, post cards included', () => {
        expect(eventThemeStyle('#BFE6E2')).toEqual({
            '--event-bg': '#BFE6E2',
            '--event-card-bg': '#BFE6E2',
            // The card is the page colour on a themed event, so its divider is a darker shade of it.
            '--event-card-line': 'color-mix(in oklab, #BFE6E2 85%, #000000)',
            '--surface-muted': 'color-mix(in oklab, #BFE6E2 15%, #ffffff)',
            '--orangish': '#ffffff',
        });
    });

    it('adds the title colour and heading font when the theme has them', () => {
        expect(
            eventThemeStyle('#BFE6E2', {
                titleColor: '#7A1F3D',
                headingFont: { key: 'dino-serif', fallback: 'serif', url: '/api/theme-fonts/dino-serif/1.woff2' },
            }),
        ).toMatchObject({ '--event-title': '#7A1F3D', '--event-heading-font': '"theme-dino-serif", serif' });
    });

    it('leaves the title colour and font unset when the theme has none', () => {
        const style = eventThemeStyle('#BFE6E2', { titleColor: null, headingFont: null });
        expect(style).not.toHaveProperty('--event-title');
        expect(style).not.toHaveProperty('--event-heading-font');
    });

    it('ignores a title colour or font that is not well-formed', () => {
        const style = eventThemeStyle('#BFE6E2', { titleColor: 'red', headingFont: { key: 'x"}', fallback: 'serif', url: '/evil' } as never });
        expect(style).not.toHaveProperty('--event-title');
        expect(style).not.toHaveProperty('--event-heading-font');
    });

    it('is undefined without a colour, so the default background shows', () => {
        expect(eventThemeStyle(null)).toBeUndefined();
        expect(eventThemeStyle(undefined)).toBeUndefined();
        expect(eventThemeStyle('')).toBeUndefined();
    });

    it('ignores a value that is not #RRGGBB', () => {
        expect(eventThemeStyle('url(https://example.com/x.png)')).toBeUndefined();
    });
});

describe('themeFontFaceCss', () => {
    it('declares the face for a well-formed font', () => {
        expect(themeFontFaceCss({ key: 'dino-serif', fallback: 'serif', url: '/api/theme-fonts/dino-serif/1.woff2' })).toBe(
            '@font-face{font-family:"theme-dino-serif";src:url("/api/theme-fonts/dino-serif/1.woff2") format("woff2");font-display:swap;}',
        );
        expect(themeFontFaceCss({ key: 'dino-serif', fallback: 'sans-serif', url: '/api/theme-fonts/dino-serif/0.woff2' })).not.toBeNull();
        expect(themeFontFaceCss({ key: 'dino-serif', fallback: 'serif', url: '/api/theme-fonts/dino-serif/123456789.woff2' })).not.toBeNull();
    });

    it('refuses anything that could break out of the rule', () => {
        expect(themeFontFaceCss({ key: 'dino-serif', fallback: 'serif', url: 'https://evil.test/x.woff2' })).toBeNull();
        expect(themeFontFaceCss({ key: 'a"}body{x', fallback: 'serif', url: '/api/theme-fonts/a/1.woff2' })).toBeNull();
        expect(themeFontFaceCss({ key: 'dino-serif', fallback: 'cursive' as never, url: '/api/theme-fonts/dino-serif/1.woff2' })).toBeNull();
        expect(themeFontFaceCss(null)).toBeNull();
        expect(themeFontFaceCss(undefined)).toBeNull();
    });

    it('refuses a version the font route would not serve', () => {
        for (const version of ['01', '00', '1234567890', '-1', '1.5', '']) {
            expect(
                themeFontFaceCss({ key: 'dino-serif', fallback: 'serif', url: `/api/theme-fonts/dino-serif/${version}.woff2` }),
                version,
            ).toBeNull();
        }
    });

    it("refuses a url that points at another font's file", () => {
        expect(themeFontFaceCss({ key: 'dino-serif', fallback: 'serif', url: '/api/theme-fonts/swan-script/1.woff2' })).toBeNull();
        expect(themeFontFaceCss({ key: 'dino', fallback: 'serif', url: '/api/theme-fonts/dino-serif/1.woff2' })).toBeNull();
    });
});

describe('themeFontScopeProps', () => {
    it('marks the scope only for a usable font', () => {
        expect(themeFontScopeProps({ key: 'dino-serif', fallback: 'serif', url: '/api/theme-fonts/dino-serif/1.woff2' })).toEqual({
            'data-theme-font': '',
        });
        expect(themeFontScopeProps({ key: 'dino-serif', fallback: 'serif', url: '/api/theme-fonts/other/1.woff2' })).toEqual({});
        expect(themeFontScopeProps(null)).toEqual({});
    });
});

describe('isThemedEventPage', () => {
    it('themes the guest-facing event pages', () => {
        for (const path of [
            '/events/e1/feed',
            '/events/e1/location/main',
            '/events/e1/story/schedule',
            '/events/e1/tools/gallery',
            '/events/e1/tools/gifts',
            '/events/e1/tools/he-or-she',
            '/events/e1/tools/playlist',
            '/events/e1/tools/quiz',
            '/events/e1/tools/schedule',
            '/events/e1/tools/wishbook',
            '/events/e1/tools/rsvp/submit',
        ]) {
            expect(isThemedEventPage(path), path).toBe(true);
        }
    });

    it("leaves the host's working pages plain", () => {
        for (const path of [
            '/events/e1/manage',
            '/events/e1/manage/qr',
            '/events/e1/manage/gift/card',
            '/events/e1/checkout/review',
            '/events/e1/settings/plan',
            '/events/e1/tools/gallery/qr',
            '/events/e1/tools/rsvp',
            '/events/e1/feedback',
            '/post/p1',
            '/home',
        ]) {
            expect(isThemedEventPage(path), path).toBe(false);
        }
    });
});

describe('canPickTheme', () => {
    const NOW = Date.parse('2026-10-05T12:00:00Z');
    function event(overrides: Record<string, unknown> = {}) {
        return {
            // isAvailable is false for every non-ACTIVE event, so it must not matter.
            modules: [{ moduleKey: 'theme', isAvailable: false, isEnabled: true }],
            deletedAt: null,
            suspended: false,
            schedule: { endAt: null },
            ...overrides,
        } as unknown as Pick<EventDetailResponseDto, 'modules' | 'deletedAt' | 'suspended' | 'schedule'>;
    }

    it('is true for an enabled theme row even when isAvailable is false (a draft)', () => {
        expect(canPickTheme(event(), NOW)).toBe(true);
    });

    it('is false when the row is missing or not enabled', () => {
        expect(canPickTheme(event({ modules: [] }), NOW)).toBe(false);
        expect(canPickTheme(event({ modules: [{ moduleKey: 'theme', isAvailable: true, isEnabled: false }] }), NOW)).toBe(false);
        expect(canPickTheme(event({ modules: [{ moduleKey: 'rsvp', isAvailable: true, isEnabled: true }] }), NOW)).toBe(false);
    });

    it('is false for a deleted, suspended or ended event', () => {
        expect(canPickTheme(event({ deletedAt: '2026-10-01T00:00:00Z' }), NOW)).toBe(false);
        expect(canPickTheme(event({ suspended: true }), NOW)).toBe(false);
        expect(canPickTheme(event({ schedule: { endAt: '2026-10-01T00:00:00Z' } }), NOW)).toBe(false);
        expect(canPickTheme(event({ schedule: { endAt: '2026-12-01T00:00:00Z' } }), NOW)).toBe(true);
    });
});

describe('isThemeFontUrl', () => {
    it('accepts only the font route path of that same font', () => {
        expect(isThemeFontUrl('/api/theme-fonts/gfs-didot/1.woff2', 'gfs-didot')).toBe(true);
        expect(isThemeFontUrl('/api/theme-fonts/other/1.woff2', 'gfs-didot')).toBe(false);
        expect(isThemeFontUrl('/api/theme-fonts/gfs-didot/01.woff2', 'gfs-didot')).toBe(false);
        expect(isThemeFontUrl('https://evil.example/api/theme-fonts/gfs-didot/1.woff2', 'gfs-didot')).toBe(false);
    });
});
