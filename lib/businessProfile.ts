import type { BusinessProfileRequestDto, BusinessProfileResponseDto } from '@/lib/api/types';

// Query keys live outside the hook so the server profile page can seed the
// cache without importing a client-only module.
export const businessProfileKeys = {
    mine: ['businessProfile', 'me'] as const,
};

// VIES member-state codes (business-buyers-fe-integration.md §2): the 27 EU
// states, with EL for Greece (not GR), plus XI for Northern Ireland.
export const VIES_COUNTRY_CODES = [
    'AT',
    'BE',
    'BG',
    'CY',
    'CZ',
    'DE',
    'DK',
    'EE',
    'EL',
    'ES',
    'FI',
    'FR',
    'HR',
    'HU',
    'IE',
    'IT',
    'LT',
    'LU',
    'LV',
    'MT',
    'NL',
    'PL',
    'PT',
    'RO',
    'SE',
    'SI',
    'SK',
    'XI',
] as const;

export type ViesCountryCode = (typeof VIES_COUNTRY_CODES)[number];

// XI (Northern Ireland) is not an ISO region, so the caller names it itself.
export function viesCountryName(locale: string, code: string, northernIrelandLabel: string): string {
    if (code === 'XI') return northernIrelandLabel;
    const region = code === 'EL' ? 'GR' : code;
    try {
        return new Intl.DisplayNames([locale], { type: 'region' }).of(region) ?? code;
    } catch {
        return code;
    }
}

export type BusinessProfileForm = {
    legalName: string;
    countryCode: string;
    vatNumber: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    postalCode: string;
};

export type BusinessProfileField = keyof BusinessProfileForm;

export const EMPTY_BUSINESS_PROFILE_FORM: BusinessProfileForm = {
    legalName: '',
    countryCode: 'EL',
    vatNumber: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postalCode: '',
};

export function toBusinessProfileForm(profile: BusinessProfileResponseDto | null | undefined): BusinessProfileForm {
    if (!profile) return EMPTY_BUSINESS_PROFILE_FORM;
    return {
        legalName: profile.legalName,
        countryCode: profile.countryCode,
        vatNumber: profile.vatNumber,
        addressLine1: profile.addressLine1,
        addressLine2: profile.addressLine2 ?? '',
        city: profile.city,
        postalCode: profile.postalCode,
    };
}

// Newlines and other control characters are refused by the backend: these
// fields go on the Stripe payment page.

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;

function clean(value: string): string {
    return value.replace(CONTROL_CHARACTERS, ' ').trim();
}

export function toBusinessProfileRequest(form: BusinessProfileForm): BusinessProfileRequestDto {
    const addressLine2 = clean(form.addressLine2);
    return {
        legalName: clean(form.legalName),
        countryCode: form.countryCode,
        vatNumber: form.vatNumber.trim(),
        addressLine1: clean(form.addressLine1),
        addressLine2: addressLine2 || null,
        city: clean(form.city),
        postalCode: clean(form.postalCode),
    };
}

// What the Stripe footer prints: the VIES prefix plus the stored number.
export function formatVatNumber(profile: Pick<BusinessProfileResponseDto, 'countryCode' | 'vatNumber'>): string {
    return `${profile.countryCode}${profile.vatNumber}`;
}

// The account buys as a business only once VIES confirmed the number.
export function isBusinessBuyer(profile: BusinessProfileResponseDto | null | undefined): boolean {
    return Boolean(profile?.business);
}

// What checkout says about the buyer: the business notice in place of the
// consumer withdrawal checkboxes, or why a saved profile still buys as a consumer.
export type CheckoutBuyerNotice = 'business' | 'pending' | 'invalid' | null;

export function checkoutBuyerNotice(profile: BusinessProfileResponseDto | null | undefined): CheckoutBuyerNotice {
    if (!profile) return null;
    if (profile.business) return 'business';
    if (profile.viesStatus === 'PENDING') return 'pending';
    if (profile.viesStatus === 'INVALID') return 'invalid';
    return null;
}

// A consumer must tick both withdrawal boxes; a VIES-confirmed business buyer
// may skip them (business-buyers-fe-integration.md §1). termsVersion is always required.
export function isCheckoutConsentSatisfied({
    isBusiness,
    requestsImmediateStart,
    acknowledgesWithdrawalTerms,
    termsVersion,
}: {
    isBusiness: boolean;
    requestsImmediateStart: boolean;
    acknowledgesWithdrawalTerms: boolean;
    termsVersion: string | null;
}): boolean {
    if (!termsVersion) return false;
    return isBusiness || (requestsImmediateStart && acknowledgesWithdrawalTerms);
}

const REQUIRED_BUSINESS_PROFILE_FIELDS = ['legalName', 'countryCode', 'vatNumber', 'addressLine1', 'city', 'postalCode'] as const;

function isViesCountryCode(code: string): code is ViesCountryCode {
    return (VIES_COUNTRY_CODES as readonly string[]).includes(code);
}

// Fields the backend would refuse as missing, or a country outside VIES.
// Checked before signup, where every rejected attempt counts against the limit.
export function invalidBusinessProfileFields(form: BusinessProfileForm): BusinessProfileField[] {
    const request = toBusinessProfileRequest(form);
    return REQUIRED_BUSINESS_PROFILE_FIELDS.filter((field) => (field === 'countryCode' ? !isViesCountryCode(request.countryCode) : !request[field]));
}

const SIGNUP_FIELD_PREFIX = 'businessProfile.';

// Signup names business fields as "businessProfile.<field>"; keep only those.
export function toSignupBusinessFieldErrors(errors: Record<string, string> | undefined): Partial<Record<BusinessProfileField, string>> {
    const result: Partial<Record<BusinessProfileField, string>> = {};
    for (const [key, message] of Object.entries(errors ?? {})) {
        if (!key.startsWith(SIGNUP_FIELD_PREFIX)) continue;
        const field = key.slice(SIGNUP_FIELD_PREFIX.length);
        if (field in EMPTY_BUSINESS_PROFILE_FORM) result[field as BusinessProfileField] = message;
    }
    return result;
}
