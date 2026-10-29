import type { Locale } from '@/i18n/config';
import { ApiError } from '@/lib/api/client';
import { isRateLimitedError } from '@/lib/api/errors';
import type { PartnerApplicationRequestDto, PartnerRole } from '@/lib/api/types';

// The order the role select shows them in.
export const APPLICATION_ROLES: readonly PartnerRole[] = [
    'PLANNER',
    'VENUE',
    'PHOTOGRAPHER',
    'VIDEOGRAPHER',
    'DECORATION',
    'CATERING',
    'MUSIC',
    'OTHER',
];

// ISO 3166-1 alpha-2, every officially assigned code.
// prettier-ignore
export const COUNTRY_CODES: readonly string[] = (
    'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ ' +
    'BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
    'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ ' +
    'DE DJ DK DM DO DZ ' +
    'EC EE EG EH ER ES ET ' +
    'FI FJ FK FM FO FR ' +
    'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY ' +
    'HK HM HN HR HT HU ' +
    'ID IE IL IM IN IO IQ IR IS IT ' +
    'JE JM JO JP ' +
    'KE KG KH KI KM KN KP KR KW KY KZ ' +
    'LA LB LC LI LK LR LS LT LU LV LY ' +
    'MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ ' +
    'NA NC NE NF NG NI NL NO NP NR NU NZ ' +
    'OM ' +
    'PA PE PF PG PH PK PL PM PN PR PS PT PW PY ' +
    'QA ' +
    'RE RO RS RU RW ' +
    'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ ' +
    'TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ ' +
    'UA UG UM US UY UZ ' +
    'VA VC VE VG VI VN VU ' +
    'WF WS ' +
    'YE YT ' +
    'ZA ZM ZW'
).split(' ');

export type CountryOption = { code: string; name: string };

// Built on the server and passed to the form, so server and browser never
// disagree on a country's name during hydration.
export function countryOptions(locale: string): CountryOption[] {
    const names = new Intl.DisplayNames([locale], { type: 'region' });
    return COUNTRY_CODES.map((code) => ({ code, name: names.of(code) ?? code })).sort((a, b) => a.name.localeCompare(b.name, locale));
}

export function defaultCountryCode(locale: Locale): string {
    return locale === 'el' ? 'GR' : '';
}

const UTM_MAX_LENGTH = 100;

export function readUtm(search: string): Pick<PartnerApplicationRequestDto, 'utmSource' | 'utmMedium' | 'utmCampaign'> {
    const params = new URLSearchParams(search);
    const read = (key: string) => params.get(key)?.trim().slice(0, UTM_MAX_LENGTH) || null;
    return { utmSource: read('utm_source'), utmMedium: read('utm_medium'), utmCampaign: read('utm_campaign') };
}

function text(formData: FormData, key: string): string {
    return String(formData.get(key) ?? '').trim();
}

// consent is a required checkbox, so a submitted form always carries it.
export function applicationRequestFromFormData(formData: FormData, context: { locale: string; search: string }): PartnerApplicationRequestDto {
    return {
        name: text(formData, 'name'),
        businessName: text(formData, 'businessName'),
        role: text(formData, 'role') as PartnerRole,
        email: text(formData, 'email').toLowerCase(),
        link: text(formData, 'link'),
        countryCode: text(formData, 'countryCode'),
        phone: text(formData, 'phone') || null,
        locale: context.locale,
        consent: true,
        ...readUtm(context.search),
        website: String(formData.get('website') ?? ''),
    };
}

export type ApplicationError = 'invalid' | 'exists' | 'rateLimited' | 'failed';

export function toApplicationError(error: unknown): ApplicationError {
    if (isRateLimitedError(error)) return 'rateLimited';
    if (error instanceof ApiError && error.status === 409) return 'exists';
    if (error instanceof ApiError && error.status === 400) return 'invalid';
    return 'failed';
}

// Starting values for the apply form's text fields and role select.
export type ApplyFormDefaults = Partial<Record<'name' | 'businessName' | 'role' | 'email' | 'link', string>>;

// The apply-form fields a set of starting values can fill, in the order the form shows them.
export const PREFILLABLE_APPLY_FIELDS = ['name', 'businessName', 'role', 'email', 'link'] as const;
export type PrefillableApplyField = (typeof PREFILLABLE_APPLY_FIELDS)[number];

// The prefillable fields that have a non-blank starting value.
export function filledApplyFields(defaults: ApplyFormDefaults | undefined): PrefillableApplyField[] {
    return PREFILLABLE_APPLY_FIELDS.filter((field) => !!defaults?.[field]?.trim());
}
