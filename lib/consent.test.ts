import { afterEach, describe, expect, it } from 'vitest';

import { clearAdCookies, clearAnalyticsCookies, CONSENT_COOKIE, CONSENT_VERSION, readConsent, writeConsent } from '@/lib/consent';

function expireAll() {
    for (const part of document.cookie.split(';')) {
        const name = part.trim().split('=')[0];
        if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
    }
}

describe('consent cookie', () => {
    afterEach(expireAll);

    it('reads back what was written', () => {
        const written = writeConsent({ ads: true, analytics: false });

        expect(readConsent()).toEqual(written);
        expect(written).toMatchObject({ v: CONSENT_VERSION, ads: true, analytics: false });
    });

    it('is null when nothing was chosen', () => {
        expect(readConsent()).toBeNull();
    });

    it('is null when the cookie is malformed or from another version', () => {
        document.cookie = `${CONSENT_COOKIE}=not-json; Path=/`;
        expect(readConsent()).toBeNull();

        const other = encodeURIComponent(JSON.stringify({ v: CONSENT_VERSION + 1, ads: true, analytics: true, at: '2026-01-01T00:00:00.000Z' }));
        document.cookie = `${CONSENT_COOKIE}=${other}; Path=/`;
        expect(readConsent()).toBeNull();
    });

    it('asks again when the saved choice is from before Analytics was added', () => {
        const v1 = encodeURIComponent(JSON.stringify({ v: 1, ads: true, at: '2026-01-01T00:00:00.000Z' }));
        document.cookie = `${CONSENT_COOKIE}=${v1}; Path=/`;
        expect(readConsent()).toBeNull();
    });
});

describe('clearAdCookies', () => {
    afterEach(expireAll);

    it("removes Google Ads' cookies and nothing else", () => {
        document.cookie = '_gcl_aw=GCL.1.abc; Path=/';
        document.cookie = '_gcl_au=1.1.2; Path=/';
        document.cookie = 'NEXT_LOCALE=el; Path=/';

        clearAdCookies();

        expect(document.cookie).not.toContain('_gcl_');
        expect(document.cookie).toContain('NEXT_LOCALE=el');
    });
});

describe('clearAnalyticsCookies', () => {
    afterEach(expireAll);

    it("removes Google Analytics' cookies and nothing else", () => {
        document.cookie = '_ga=GA1.1.123; Path=/';
        document.cookie = '_ga_ABC123=GS1.1.456; Path=/';
        document.cookie = '_gcl_aw=GCL.1.abc; Path=/';

        clearAnalyticsCookies();

        expect(document.cookie).not.toContain('_ga=');
        expect(document.cookie).not.toContain('_ga_ABC123');
        expect(document.cookie).toContain('_gcl_aw');
    });
});
