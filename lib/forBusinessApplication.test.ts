import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/client';
import {
    applicationRequestFromFormData,
    COUNTRY_CODES,
    countryOptions,
    defaultCountryCode,
    readUtm,
    toApplicationError,
} from '@/lib/forBusinessApplication';

function formData(values: Record<string, string>): FormData {
    const data = new FormData();
    for (const [key, value] of Object.entries(values)) data.set(key, value);
    return data;
}

describe('COUNTRY_CODES', () => {
    it('holds every ISO 3166-1 alpha-2 code once', () => {
        expect(COUNTRY_CODES).toHaveLength(249);
        expect(new Set(COUNTRY_CODES).size).toBe(249);
        expect(COUNTRY_CODES).toContain('GR');
        expect(COUNTRY_CODES).toContain('US');
    });
});

describe('countryOptions', () => {
    it('names countries in the page language, sorted by name', () => {
        const options = countryOptions('en');
        expect(options.find((option) => option.code === 'GR')?.name).toBe('Greece');
        const names = options.map((option) => option.name);
        expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
    });
});

describe('defaultCountryCode', () => {
    it('preselects Greece only on the Greek page', () => {
        expect(defaultCountryCode('el')).toBe('GR');
        expect(defaultCountryCode('en')).toBe('');
    });
});

describe('readUtm', () => {
    it('reads the three UTM params and nulls the rest', () => {
        expect(readUtm('?utm_source=instagram&utm_campaign=founding')).toEqual({
            utmSource: 'instagram',
            utmMedium: null,
            utmCampaign: 'founding',
        });
    });

    it('caps each value at 100 characters', () => {
        expect(readUtm(`?utm_source=${'a'.repeat(150)}`).utmSource).toHaveLength(100);
    });
});

describe('applicationRequestFromFormData', () => {
    it('trims, lowercases the email and nulls an empty phone', () => {
        const body = applicationRequestFromFormData(
            formData({
                name: ' Maria ',
                businessName: ' Studio M ',
                role: 'PHOTOGRAPHER',
                email: ' Maria@Example.com ',
                link: ' @studiom ',
                countryCode: 'GR',
                phone: ' ',
                website: '',
            }),
            { locale: 'el', search: '?utm_source=ig' },
        );
        expect(body).toEqual({
            name: 'Maria',
            businessName: 'Studio M',
            role: 'PHOTOGRAPHER',
            email: 'maria@example.com',
            link: '@studiom',
            countryCode: 'GR',
            phone: null,
            locale: 'el',
            consent: true,
            utmSource: 'ig',
            utmMedium: null,
            utmCampaign: null,
            website: '',
        });
    });
});

describe('toApplicationError', () => {
    it('maps statuses to the form errors', () => {
        expect(toApplicationError(new ApiError(409, null))).toBe('exists');
        expect(toApplicationError(new ApiError(400, null))).toBe('invalid');
        expect(toApplicationError(new ApiError(429, null))).toBe('rateLimited');
        expect(toApplicationError(new Error('offline'))).toBe('failed');
    });
});
