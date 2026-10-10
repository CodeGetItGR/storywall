import { describe, expect, it } from 'vitest';

import { getForBusinessPath, isForBusinessPath, publicPageLocale, publicTwinPath } from '@/i18n/publicLocale';

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

describe('publicPageLocale', () => {
    it('reads the locale from the landing and partner URLs', () => {
        expect(publicPageLocale('/')).toBe('en');
        expect(publicPageLocale('/el')).toBe('el');
        expect(publicPageLocale('/for-business')).toBe('en');
        expect(publicPageLocale('/el/epaggelmaties')).toBe('el');
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

    it('is null for any other page', () => {
        expect(publicTwinPath('/feed', 'el')).toBeNull();
        expect(publicTwinPath(null, 'el')).toBeNull();
    });
});
