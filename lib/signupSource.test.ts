import { afterEach, describe, expect, it } from 'vitest';

import {
    captureVisitSource,
    carryClickTarget,
    currentVisitSource,
    decodeVisitSource,
    encodeVisitSource,
    isLandingPath,
    pickVisitSource,
    readVisitSourceCookie,
    rememberVisitSource,
    takeVisitSourceParam,
    VISIT_SOURCE_COOKIE,
    type VisitSource,
    withoutVisitSourceParam,
    writeVisitSourceCookie,
} from '@/lib/signupSource';

const ORIGIN = 'https://storywall.gr';

const INSTAGRAM: VisitSource = {
    utmSource: 'instagram',
    utmMedium: 'social',
    utmCampaign: 'bio-link',
    adClick: false,
    referrerHost: 'l.instagram.com',
    landingPage: '/',
};

afterEach(() => {
    rememberVisitSource(null);
    document.cookie = `${VISIT_SOURCE_COOKIE}=; Max-Age=0; Path=/`;
    document.body.innerHTML = '';
});

describe('captureVisitSource', () => {
    it('reads campaign parameters, an ad click and the referrer host', () => {
        const source = captureVisitSource(
            `${ORIGIN}/?utm_source=instagram&utm_medium=social&utm_campaign=bio-link&gclid=abc`,
            'https://l.instagram.com/x?y=1',
            {},
        );
        expect(source).toEqual({ ...INSTAGRAM, adClick: true });
    });

    it('stores the route pattern, never the real path', () => {
        const source = captureVisitSource(`${ORIGIN}/gift/tok-123`, '', { token: 'tok-123' });
        expect(source?.landingPage).toBe('/gift/[token]');
    });

    it('is a direct visit when there is no campaign and no referrer', () => {
        expect(captureVisitSource(`${ORIGIN}/register`, '', {})).toEqual({
            utmSource: null,
            utmMedium: null,
            utmCampaign: null,
            adClick: false,
            referrerHost: null,
            landingPage: '/register',
        });
    });

    it('is nothing new when the referrer is this site and there is no campaign', () => {
        expect(captureVisitSource(`${ORIGIN}/events/new`, `${ORIGIN}/`, {})).toBeNull();
    });

    it('still counts campaign parameters on an in-site link', () => {
        expect(captureVisitSource(`${ORIGIN}/?utm_source=newsletter`, `${ORIGIN}/el`, {})?.utmSource).toBe('newsletter');
    });

    it('prefers a source carried in the src param', () => {
        const href = `${ORIGIN}/events/new?src=${encodeURIComponent(encodeVisitSource(INSTAGRAM))}`;
        expect(captureVisitSource(href, `${ORIGIN}/`, {})).toEqual(INSTAGRAM);
    });

    it('caps values and strips control characters', () => {
        const long = 'a'.repeat(150);
        const source = captureVisitSource(`${ORIGIN}/?utm_campaign=${long}&utm_source=%0Aig%07`, '', {});
        expect(source?.utmCampaign).toHaveLength(100);
        expect(source?.utmSource).toBe('ig');
    });
});

describe('decodeVisitSource', () => {
    it('rejects junk and a source without a landing page', () => {
        expect(decodeVisitSource('not json')).toBeNull();
        expect(decodeVisitSource(JSON.stringify({ utmSource: 'x' }))).toBeNull();
        expect(decodeVisitSource(JSON.stringify({ ...INSTAGRAM, landingPage: 'https://evil.example/' }))).toBeNull();
    });

    it('drops a referrer that is not a bare host', () => {
        expect(decodeVisitSource(JSON.stringify({ ...INSTAGRAM, referrerHost: 'https://x.com/a' }))?.referrerHost).toBeNull();
    });
});

describe('pickVisitSource', () => {
    const later: VisitSource = { ...INSTAGRAM, utmSource: 'google', utmMedium: 'cpc' };
    const gift: VisitSource = { ...later, landingPage: '/gift/[token]' };

    it('keeps the first visit', () => {
        expect(pickVisitSource(INSTAGRAM, later)).toBe(INSTAGRAM);
        expect(pickVisitSource(null, later)).toBe(later);
        expect(pickVisitSource(INSTAGRAM, null)).toBe(INSTAGRAM);
    });

    it('lets a gift page replace it', () => {
        expect(pickVisitSource(INSTAGRAM, gift)).toBe(gift);
    });
});

describe('isLandingPath', () => {
    it('knows the pages under app/(landing)', () => {
        expect(isLandingPath('/')).toBe(true);
        expect(isLandingPath('/for-business')).toBe(true);
        expect(isLandingPath('/qr-code-for-wedding-photos')).toBe(true);
        expect(isLandingPath('/el/qr-code-gamou')).toBe(true);
        expect(isLandingPath('/el')).toBe(true);
        expect(isLandingPath('/el/wedding')).toBe(true);
        // English occasion pages sit at the top level, without a locale.
        expect(isLandingPath('/weddings')).toBe(true);
        expect(isLandingPath('/baptisms')).toBe(true);
        expect(isLandingPath('/events/new')).toBe(false);
        expect(isLandingPath('/register')).toBe(false);
    });
});

describe('withoutVisitSourceParam', () => {
    it('removes src and keeps everything else', () => {
        expect(withoutVisitSourceParam(`${ORIGIN}/events/new?next=%2Fhome&src=abc#top`)).toBe('/events/new?next=%2Fhome#top');
    });

    it('is null when there is nothing to remove', () => {
        expect(withoutVisitSourceParam(`${ORIGIN}/events/new`)).toBeNull();
    });
});

describe('takeVisitSourceParam', () => {
    it('splits a carried src from the rest of the query', () => {
        expect(takeVisitSourceParam('?type=wedding&src=%7B%7D&step=a%20b')).toEqual({ search: '?type=wedding&step=a%20b', source: '{}' });
    });

    it('leaves a query without src exactly as it was', () => {
        expect(takeVisitSourceParam('?step=a%20b')).toEqual({ search: '?step=a%20b', source: null });
        expect(takeVisitSourceParam('')).toEqual({ search: '', source: null });
        expect(takeVisitSourceParam('?src=%7B%7D')).toEqual({ search: '', source: '{}' });
    });
});

describe('carryClickTarget', () => {
    function anchor(href: string, attributes: Record<string, string> = {}) {
        const link = document.createElement('a');
        link.href = href;
        for (const [name, value] of Object.entries(attributes)) link.setAttribute(name, value);
        const label = document.createElement('span');
        link.append(label);
        document.body.append(link);
        return label;
    }

    const click = (target: Element, extra: Partial<MouseEvent> = {}) =>
        ({ defaultPrevented: false, button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, target, ...extra }) as MouseEvent;

    it('adds the source to a plain click into the app', () => {
        const href = carryClickTarget(click(anchor(`${ORIGIN}/events/new?next=x`)), ORIGIN, INSTAGRAM);
        expect(href).not.toBeNull();
        const url = new URL(href!);
        expect(url.pathname).toBe('/events/new');
        expect(url.searchParams.get('next')).toBe('x');
        expect(decodeVisitSource(url.searchParams.get('src'))).toEqual(INSTAGRAM);
    });

    it('leaves landing links, other sites, new tabs and modified clicks alone', () => {
        expect(carryClickTarget(click(anchor(`${ORIGIN}/el`)), ORIGIN, INSTAGRAM)).toBeNull();
        expect(carryClickTarget(click(anchor('https://instagram.com/storywall')), ORIGIN, INSTAGRAM)).toBeNull();
        expect(carryClickTarget(click(anchor(`${ORIGIN}/login`, { target: '_blank' })), ORIGIN, INSTAGRAM)).toBeNull();
        expect(carryClickTarget(click(anchor(`${ORIGIN}/login`), { ctrlKey: true }), ORIGIN, INSTAGRAM)).toBeNull();
        expect(carryClickTarget(click(anchor(`${ORIGIN}/login`), { defaultPrevented: true }), ORIGIN, INSTAGRAM)).toBeNull();
    });

    it('does nothing without a source', () => {
        expect(carryClickTarget(click(anchor(`${ORIGIN}/login`)), ORIGIN, null)).toBeNull();
    });
});

describe('cookie and page memory', () => {
    it('round-trips through the cookie', () => {
        writeVisitSourceCookie(INSTAGRAM);
        expect(readVisitSourceCookie()).toEqual(INSTAGRAM);
    });

    it('prefers page memory, then falls back to the cookie', () => {
        expect(currentVisitSource()).toBeNull();
        writeVisitSourceCookie(INSTAGRAM);
        expect(currentVisitSource()).toEqual(INSTAGRAM);
        const memory = { ...INSTAGRAM, utmSource: 'ig' };
        rememberVisitSource(memory);
        expect(currentVisitSource()).toBe(memory);
    });
});
