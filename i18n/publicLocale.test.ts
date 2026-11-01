import { describe, expect, it } from 'vitest';

import {
    getForBusinessPath,
    getLegalPagePath,
    getQrWeddingPath,
    isForBusinessPath,
    isQrWeddingPath,
    legalPageForPath,
    localizeLegalHref,
    publicPageLocale,
    publicTwinPath,
} from '@/i18n/publicLocale';

describe('getForBusinessPath', () => {
    it('gives each locale its own slug', () => {
        expect(getForBusinessPath('en')).toBe('/for-business');
        expect(getForBusinessPath('el')).toBe('/el/epaggelmaties');
    });
});

describe('isForBusinessPath', () => {
    it('matches only the two partner page URLs', () => {
        expect(isForBusinessPath('/for-business')).toBe(true);
        expect(isForBusinessPath('/el/epaggelmaties')).toBe(true);
        expect(isForBusinessPath('/el/for-business')).toBe(false);
        expect(isForBusinessPath('/en/epaggelmaties')).toBe(false);
        expect(isForBusinessPath(null)).toBe(false);
    });
});

describe('getQrWeddingPath', () => {
    it('gives each locale its own slug', () => {
        expect(getQrWeddingPath('en')).toBe('/qr-code-for-wedding-photos');
        expect(getQrWeddingPath('el')).toBe('/el/qr-code-gamou');
    });
});

describe('isQrWeddingPath', () => {
    it('matches only the two wedding QR URLs', () => {
        expect(isQrWeddingPath('/qr-code-for-wedding-photos')).toBe(true);
        expect(isQrWeddingPath('/el/qr-code-gamou')).toBe(true);
        expect(isQrWeddingPath('/en/qr-code-for-wedding-photos')).toBe(false);
        expect(isQrWeddingPath('/el/qr-code-for-wedding-photos')).toBe(false);
        expect(isQrWeddingPath(null)).toBe(false);
    });
});

describe('publicPageLocale', () => {
    it('reads the locale from the landing and partner URLs', () => {
        expect(publicPageLocale('/')).toBe('en');
        expect(publicPageLocale('/el')).toBe('el');
        expect(publicPageLocale('/for-business')).toBe('en');
        expect(publicPageLocale('/el/epaggelmaties')).toBe('el');
    });

    it('reads the locale from the wedding QR URLs', () => {
        expect(publicPageLocale('/qr-code-for-wedding-photos')).toBe('en');
        expect(publicPageLocale('/el/qr-code-gamou')).toBe('el');
        expect(publicPageLocale('/en/qr-code-gamou')).toBeNull();
    });

    it('is null everywhere else', () => {
        expect(publicPageLocale('/feed')).toBeNull();
        expect(publicPageLocale('/el/for-business')).toBeNull();
        expect(publicPageLocale('/partners/abc')).toBeNull();
    });
});

describe('publicTwinPath', () => {
    it('maps the landing to the landing', () => {
        expect(publicTwinPath('/', 'el')).toBe('/el');
        expect(publicTwinPath('/el', 'en')).toBe('/');
    });

    it('maps the partner page to the partner page', () => {
        expect(publicTwinPath('/for-business', 'el')).toBe('/el/epaggelmaties');
        expect(publicTwinPath('/el/epaggelmaties', 'en')).toBe('/for-business');
    });

    it('maps a legal page to the same page', () => {
        expect(publicTwinPath('/legal/terms', 'el')).toBe('/el/legal/terms');
        expect(publicTwinPath('/el/contact', 'en')).toBe('/contact');
    });

    it('is null for any other page', () => {
        expect(publicTwinPath('/feed', 'el')).toBeNull();
        expect(publicTwinPath(null, 'el')).toBeNull();
    });
});

describe('getLegalPagePath', () => {
    it('puts the Greek page under /el', () => {
        expect(getLegalPagePath('/legal/privacy', 'en')).toBe('/legal/privacy');
        expect(getLegalPagePath('/legal/privacy', 'el')).toBe('/el/legal/privacy');
        expect(getLegalPagePath('/contact', 'el')).toBe('/el/contact');
    });
});

describe('legalPageForPath', () => {
    it('reads the page and language from either URL', () => {
        expect(legalPageForPath('/legal/cookies')).toEqual({ path: '/legal/cookies', locale: 'en' });
        expect(legalPageForPath('/el/legal/cookies')).toEqual({ path: '/legal/cookies', locale: 'el' });
        expect(legalPageForPath('/el/contact')).toEqual({ path: '/contact', locale: 'el' });
    });

    it('is null everywhere else', () => {
        expect(legalPageForPath('/en/legal/cookies')).toBeNull();
        expect(legalPageForPath('/el/legal')).toBeNull();
        expect(legalPageForPath('/report-content')).toBeNull();
        expect(legalPageForPath('/el/gamos')).toBeNull();
    });
});

describe('localizeLegalHref', () => {
    it('moves a legal link to the language, keeping its query and hash', () => {
        expect(localizeLegalHref('/legal/cookies', 'el')).toBe('/el/legal/cookies');
        expect(localizeLegalHref('/legal/withdrawal-terms?version=2026-10-28', 'el')).toBe('/el/legal/withdrawal-terms?version=2026-10-28');
        expect(localizeLegalHref('/legal/community-guidelines#section-3', 'el')).toBe('/el/legal/community-guidelines#section-3');
        expect(localizeLegalHref('/legal/cookies', 'en')).toBe('/legal/cookies');
    });

    it('leaves every other link alone', () => {
        expect(localizeLegalHref('/report-content', 'el')).toBe('/report-content');
        expect(localizeLegalHref('/legal/cookies-old', 'el')).toBe('/legal/cookies-old');
        expect(localizeLegalHref('/', 'el')).toBe('/');
    });
});
