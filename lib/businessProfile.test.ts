import { describe, expect, it } from 'vitest';

import type { BusinessProfileResponseDto } from './api/types';
import {
    checkoutBuyerNotice,
    EMPTY_BUSINESS_PROFILE_FORM,
    formatVatNumber,
    isCheckoutConsentSatisfied,
    toBusinessProfileForm,
    toBusinessProfileRequest,
    VIES_COUNTRY_CODES,
    viesCountryName,
} from './businessProfile';

const profile = (overrides: Partial<BusinessProfileResponseDto> = {}): BusinessProfileResponseDto => ({
    legalName: 'Acme IKE',
    countryCode: 'EL',
    vatNumber: '123456789',
    addressLine1: 'Ermou 1',
    addressLine2: null,
    city: 'Athens',
    postalCode: '10563',
    viesStatus: 'VALID',
    viesSubmittedAt: '2026-09-24T10:00:00Z',
    viesCheckedAt: '2026-09-24T10:00:01Z',
    business: true,
    ...overrides,
});

describe('VIES countries', () => {
    it('uses EL for Greece and includes Northern Ireland', () => {
        expect(VIES_COUNTRY_CODES).toContain('EL');
        expect(VIES_COUNTRY_CODES).not.toContain('GR');
        expect(VIES_COUNTRY_CODES).toContain('XI');
        expect(VIES_COUNTRY_CODES).toHaveLength(28);
    });

    it('names EL as Greece and XI with the given label', () => {
        expect(viesCountryName('en', 'EL', 'Northern Ireland')).toBe('Greece');
        expect(viesCountryName('en', 'XI', 'Northern Ireland')).toBe('Northern Ireland');
    });
});

describe('business profile form', () => {
    it('starts empty on Greece', () => {
        expect(toBusinessProfileForm(null)).toEqual(EMPTY_BUSINESS_PROFILE_FORM);
        expect(EMPTY_BUSINESS_PROFILE_FORM.countryCode).toBe('EL');
    });

    it('round-trips a saved profile, with a missing second line as empty', () => {
        expect(toBusinessProfileForm(profile()).addressLine2).toBe('');
    });

    it('trims, strips control characters, and sends an empty second line as null', () => {
        const request = toBusinessProfileRequest({
            legalName: '  Acme\nIKE ',
            countryCode: 'EL',
            vatNumber: ' EL 123.456.789 ',
            addressLine1: 'Ermou 1\t',
            addressLine2: '   ',
            city: ' Athens',
            postalCode: '10563 ',
        });
        expect(request).toEqual({
            legalName: 'Acme IKE',
            countryCode: 'EL',
            vatNumber: 'EL 123.456.789',
            addressLine1: 'Ermou 1',
            addressLine2: null,
            city: 'Athens',
            postalCode: '10563',
        });
    });

    it('prints the VAT number with its VIES prefix', () => {
        expect(formatVatNumber(profile())).toBe('EL123456789');
    });
});

describe('checkoutBuyerNotice', () => {
    it('is null with no profile', () => {
        expect(checkoutBuyerNotice(null)).toBeNull();
    });

    it('is business only for a confirmed profile', () => {
        expect(checkoutBuyerNotice(profile())).toBe('business');
        expect(checkoutBuyerNotice(profile({ viesStatus: 'PENDING', business: false }))).toBe('pending');
        expect(checkoutBuyerNotice(profile({ viesStatus: 'INVALID', business: false }))).toBe('invalid');
    });
});

describe('isCheckoutConsentSatisfied', () => {
    const base = { isBusiness: false, requestsImmediateStart: false, acknowledgesWithdrawalTerms: false, termsVersion: 'v1' };

    it('needs both boxes from a consumer', () => {
        expect(isCheckoutConsentSatisfied(base)).toBe(false);
        expect(isCheckoutConsentSatisfied({ ...base, requestsImmediateStart: true })).toBe(false);
        expect(isCheckoutConsentSatisfied({ ...base, requestsImmediateStart: true, acknowledgesWithdrawalTerms: true })).toBe(true);
    });

    it('needs no boxes from a business buyer', () => {
        expect(isCheckoutConsentSatisfied({ ...base, isBusiness: true })).toBe(true);
    });

    it('always needs a terms version', () => {
        expect(isCheckoutConsentSatisfied({ ...base, isBusiness: true, termsVersion: null })).toBe(false);
    });
});
