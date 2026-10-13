import { describe, expect, it } from 'vitest';

import {
    BUSINESS_DETAIL_FIELDS,
    businessDetailsErrors,
    businessDetailsFromFormData,
    collaboratorAddressText,
    collaboratorVatText,
    commissionTierDrafts,
    commissionTierEnd,
    commissionTiersError,
    commissionTiersFromDrafts,
    currentCommissionTierIndex,
    formatIban,
    isValidIban,
    missingPayoutFieldLabelKey,
    nextCommissionTierDraft,
    rejectedBusinessDetails,
    serverBusinessDetailErrors,
} from '@/lib/adminCollaborations';
import { ApiError } from '@/lib/api/client';
import { getApiErrorMessageKey } from '@/lib/api/errorMessageKeys';
import type { CollaboratorBusinessDetailsRequestDto } from '@/lib/api/types';

const VALID_IBAN = 'GR16 0110 1250 0000 0001 2300 695';

function details(overrides: Partial<CollaboratorBusinessDetailsRequestDto> = {}): CollaboratorBusinessDetailsRequestDto {
    return {
        websiteUrl: null,
        contactPersonName: null,
        contactPhone: null,
        billingEmail: null,
        legalName: null,
        countryCode: null,
        vatNumber: null,
        taxOffice: null,
        addressLine1: null,
        addressLine2: null,
        city: null,
        postalCode: null,
        payoutIban: null,
        payoutAccountHolder: null,
        ...overrides,
    };
}

describe('businessDetailsFromFormData', () => {
    it('sends every field, so the PUT replaces all of them', () => {
        const input = businessDetailsFromFormData(new FormData());
        expect(Object.keys(input).sort()).toEqual([...BUSINESS_DETAIL_FIELDS].sort());
        expect(Object.values(input).every((value) => value === null)).toBe(true);
    });

    it('trims values, clears blank ones with null and lower-cases the billing email', () => {
        const formData = new FormData();
        formData.set('legalName', '  Barn Venue AE  ');
        formData.set('city', '   ');
        formData.set('billingEmail', ' Invoices@Barn.Example ');
        formData.set('payoutIban', VALID_IBAN);
        const input = businessDetailsFromFormData(formData);
        expect(input.legalName).toBe('Barn Venue AE');
        expect(input.city).toBeNull();
        expect(input.billingEmail).toBe('invoices@barn.example');
        expect(input.payoutIban).toBe(VALID_IBAN);
    });
});

describe('isValidIban', () => {
    it('accepts a valid IBAN with or without spaces', () => {
        expect(isValidIban(VALID_IBAN)).toBe(true);
        expect(isValidIban('gr1601101250000000012300695')).toBe(true);
    });

    it('rejects a wrong checksum or a malformed value', () => {
        expect(isValidIban('GR17 0110 1250 0000 0001 2300 695')).toBe(false);
        expect(isValidIban('not an iban')).toBe(false);
    });
});

describe('formatIban', () => {
    it('groups the IBAN in fours', () => {
        expect(formatIban('GR1601101250000000012300695')).toBe(VALID_IBAN);
    });
});

describe('businessDetailsErrors', () => {
    it('accepts an empty form: every field is optional to save', () => {
        expect(businessDetailsErrors(details())).toEqual({});
    });

    it('accepts a complete Greek partner', () => {
        const input = details({
            websiteUrl: 'https://barn.example',
            contactPhone: '+30 210 123-4567',
            billingEmail: 'invoices@barn.example',
            countryCode: 'EL',
            vatNumber: 'EL123456789',
            taxOffice: "Α' Αθηνών",
            payoutIban: VALID_IBAN,
        });
        expect(businessDetailsErrors(input)).toEqual({});
    });

    it('names each field that breaks a format rule', () => {
        const input = details({
            websiteUrl: 'http://barn.example',
            contactPhone: '210 123 4567',
            billingEmail: 'invoices',
            countryCode: 'EL',
            payoutIban: 'GR00 0000',
        });
        expect(businessDetailsErrors(input)).toEqual({
            websiteUrl: 'websiteNotHttps',
            contactPhone: 'phoneFormat',
            billingEmail: 'emailInvalid',
            vatNumber: 'countryWithoutVat',
            payoutIban: 'ibanInvalid',
        });
    });

    it('wants a country with a VAT number, and a tax office only for a Greek one', () => {
        expect(businessDetailsErrors(details({ vatNumber: '123456789' }))).toEqual({ countryCode: 'vatWithoutCountry' });
        expect(businessDetailsErrors(details({ countryCode: 'EL', vatNumber: '123456789' }))).toEqual({ taxOffice: 'taxOfficeRequired' });
        expect(businessDetailsErrors(details({ countryCode: 'DE', vatNumber: '123456789' }))).toEqual({});
    });
});

describe('server business detail errors', () => {
    it('marks the fields a 400 names and ignores the rest', () => {
        const error = new ApiError(400, { errorCode: 3001, errors: { billingEmail: 'must be a well-formed email address', other: 'x' } });
        expect(serverBusinessDetailErrors(error)).toEqual({ billingEmail: 'invalid' });
        expect(rejectedBusinessDetails(error)).toBe(true);
    });

    it('is not a rejection for any other failure', () => {
        expect(serverBusinessDetailErrors(new Error('offline'))).toEqual({});
        expect(rejectedBusinessDetails(new ApiError(400, { errorCode: 3067 }))).toBe(true);
        expect(rejectedBusinessDetails(new ApiError(409, { errorCode: 5096 }))).toBe(false);
    });
});

describe('collaborator detail text', () => {
    it('joins the VAT prefix and the address parts that are set', () => {
        expect(collaboratorVatText({ countryCode: 'EL', vatNumber: '123456789' })).toBe('EL123456789');
        expect(collaboratorVatText({ countryCode: null, vatNumber: null })).toBeNull();
        expect(collaboratorAddressText({ addressLine1: 'Odos 1', addressLine2: null, postalCode: '10558', city: 'Athens' })).toBe(
            'Odos 1, 10558 Athens',
        );
        expect(collaboratorAddressText({ addressLine1: null, addressLine2: null, postalCode: null, city: null })).toBeNull();
    });
});

describe('missingPayoutFieldLabelKey', () => {
    it('maps the backend column names to field labels', () => {
        expect(missingPayoutFieldLabelKey('payout_iban')).toBe('payoutIban');
        expect(missingPayoutFieldLabelKey('vies_status')).toBe('viesStatus');
        expect(missingPayoutFieldLabelKey('address_line1')).toBe('addressLine1');
    });

    it('returns null for a column it does not know', () => {
        expect(missingPayoutFieldLabelKey('something_new')).toBeNull();
    });
});

describe('5096 COLLABORATOR_PAYOUT_DETAILS_INCOMPLETE', () => {
    it('has its own API error message key', () => {
        expect(getApiErrorMessageKey(5096)).toBe('collaboratorPayoutDetailsIncomplete');
    });
});

describe('commissionTiersError', () => {
    const tier = (minActivations: number, commissionPercent: number) => ({ minActivations, commissionPercent });

    it('accepts no tiers (removes the schedule) and the guide example', () => {
        expect(commissionTiersError([])).toBeNull();
        expect(commissionTiersError([tier(1, 10), tier(10, 15), tier(25, 20)])).toBeNull();
    });

    it('accepts equal rates on consecutive tiers', () => {
        expect(commissionTiersError([tier(1, 10), tier(5, 10)])).toBeNull();
    });

    it('names the first broken rule', () => {
        expect(commissionTiersError(Array.from({ length: 11 }, (_, index) => tier(index + 1, 10)))).toBe('tooMany');
        expect(commissionTiersError([tier(0, 10)])).toBe('activationsWhole');
        expect(commissionTiersError([tier(1, 0)])).toBe('percentRange');
        expect(commissionTiersError([tier(1, 101)])).toBe('percentRange');
        expect(commissionTiersError([tier(2, 10)])).toBe('firstStartsAtOne');
        expect(commissionTiersError([tier(1, 10), tier(10, 15), tier(10, 20)])).toBe('thresholdsIncrease');
        expect(commissionTiersError([tier(1, 15), tier(10, 10)])).toBe('ratesNeverDecrease');
    });

    it('treats a blank or fractional input as invalid', () => {
        const tiers = commissionTiersFromDrafts([
            { key: 'a', minActivations: '1', commissionPercent: '10' },
            { key: 'b', minActivations: '', commissionPercent: '12.5' },
        ]);
        expect(Number.isNaN(tiers[1].minActivations)).toBe(true);
        expect(commissionTiersError(tiers)).toBe('activationsWhole');
    });
});

describe('commission tier drafts', () => {
    it('round-trips saved tiers', () => {
        const saved = [
            { minActivations: 1, commissionPercent: 10 },
            { minActivations: 10, commissionPercent: 15 },
        ];
        expect(commissionTiersFromDrafts(commissionTierDrafts(saved))).toEqual(saved);
    });

    it('starts the first row at activation 1 and a later row after the last one, at the same rate', () => {
        expect(nextCommissionTierDraft([], 'k')).toEqual({ key: 'k', minActivations: '1', commissionPercent: '' });
        const drafts = commissionTierDrafts([{ minActivations: 10, commissionPercent: 15 }]);
        expect(nextCommissionTierDraft(drafts, 'k')).toEqual({ key: 'k', minActivations: '11', commissionPercent: '15' });
    });
});

describe('tier ranges', () => {
    const tiers = [
        { minActivations: 1, commissionPercent: 10 },
        { minActivations: 10, commissionPercent: 15 },
        { minActivations: 25, commissionPercent: 20 },
    ];

    it('ends each tier before the next one and leaves the top one open', () => {
        expect(commissionTierEnd(tiers, 0)).toBe(9);
        expect(commissionTierEnd(tiers, 1)).toBe(24);
        expect(commissionTierEnd(tiers, 2)).toBeNull();
    });

    it('picks the tier the next activation falls in', () => {
        expect(currentCommissionTierIndex(tiers, 0)).toBe(0);
        expect(currentCommissionTierIndex(tiers, 8)).toBe(0);
        expect(currentCommissionTierIndex(tiers, 9)).toBe(1);
        expect(currentCommissionTierIndex(tiers, 30)).toBe(2);
        expect(currentCommissionTierIndex([], 3)).toBe(-1);
    });
});
