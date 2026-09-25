import { describe, expect, it } from 'vitest';

import { buildGoogleMapsEmbedUrl, isGoogleMapsShortLink, readGoogleMapsRedirect } from '@/lib/maps';

function embedQuery(url: string | null): string | null {
    const embed = buildGoogleMapsEmbedUrl(url, 'el');
    return embed ? new URL(embed).searchParams.get('q') : null;
}

describe('buildGoogleMapsEmbedUrl', () => {
    it('uses the pinned place coordinates from a place link', () => {
        const url =
            'https://www.google.com/maps/place/Moonraft+Innovation+Labs/@12.9140057,77.6281936,17z/data=!3m1!4b1!4m6!3m5!1s0x3bae:0xdf65!8m2!3d12.9140057!4d77.6281936!16s%2Fg%2F1tg66jp9?entry=tts';
        expect(embedQuery(url)).toBe('12.9140057,77.6281936');
    });

    it('builds the embeddable form with the locale', () => {
        const embed = new URL(buildGoogleMapsEmbedUrl('https://maps.google.com/?q=Acropolis', 'el')!);
        expect(embed.origin + embed.pathname).toBe('https://www.google.com/maps');
        expect(embed.searchParams.get('output')).toBe('embed');
        expect(embed.searchParams.get('hl')).toBe('el');
        expect(embed.searchParams.get('q')).toBe('Acropolis');
    });

    it('falls back to the place name, then the viewport', () => {
        expect(embedQuery('https://www.google.com/maps/place/Bloom+Venue/')).toBe('Bloom Venue');
        expect(embedQuery('https://www.google.gr/maps/@37.97,23.72,15z')).toBe('37.97,23.72');
    });

    it('rejects links it cannot place', () => {
        expect(embedQuery('https://maps.app.goo.gl/abc')).toBeNull();
        expect(embedQuery('https://example.com/maps/place/X')).toBeNull();
        expect(embedQuery('https://www.google.com/maps')).toBeNull();
        expect(embedQuery('not a url')).toBeNull();
    });
});

describe('isGoogleMapsShortLink', () => {
    it('matches share links only', () => {
        expect(isGoogleMapsShortLink('https://maps.app.goo.gl/mWtb4a1cUE9zMWya7')).toBe(true);
        expect(isGoogleMapsShortLink('https://goo.gl/maps/abc')).toBe(true);
        expect(isGoogleMapsShortLink('https://goo.gl/other')).toBe(false);
        expect(isGoogleMapsShortLink('https://www.google.com/maps/place/X')).toBe(false);
    });
});

describe('readGoogleMapsRedirect', () => {
    const base = 'https://maps.app.goo.gl/abc';

    it('accepts Google Maps targets, including via the consent page', () => {
        expect(readGoogleMapsRedirect('https://www.google.com/maps/place/X', base)).toBe('https://www.google.com/maps/place/X');
        const consent = `https://consent.google.com/m?continue=${encodeURIComponent('https://www.google.com/maps/place/X')}`;
        expect(readGoogleMapsRedirect(consent, base)).toBe('https://www.google.com/maps/place/X');
    });

    it('rejects anything else', () => {
        expect(readGoogleMapsRedirect(null, base)).toBeNull();
        expect(readGoogleMapsRedirect('https://evil.example/maps', base)).toBeNull();
        expect(readGoogleMapsRedirect('https://www.google.com/search?q=x', base)).toBeNull();
    });
});
