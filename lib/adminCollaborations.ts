import { ERROR_CODES, getErrorCode, getFieldErrors } from '@/lib/api/errors';
import type {
    CodeRestrictionsDto,
    CollaborationCodePatchDto,
    CollaborationCodeRequestDto,
    CollaborationCodeResponseDto,
    CollaborationEarningResponseDto,
    CollaborationEarningStatus,
    CollaborationEarningsTotalDto,
    CollaboratorBusinessDetailsRequestDto,
    CollaboratorRequestDto,
    CollaboratorResponseDto,
    CommissionTierDto,
    DiscountCodePatchDto,
    DiscountCodeRequestDto,
    DiscountCodeResponseDto,
    LinkDiscountCodeRequestDto,
} from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';

// Status changes go through Suspend/Reactivate. null leaves it alone on edit and means ACTIVE on create.
export function collaboratorRequestFromFormData(formData: FormData): CollaboratorRequestDto {
    return {
        name: String(formData.get('name') ?? '').trim(),
        contactEmail: String(formData.get('contactEmail') ?? '')
            .trim()
            .toLowerCase(),
        notes: String(formData.get('notes') ?? '').trim() || null,
        status: null,
    };
}

export function collaborationCodeCreateFromFormData(formData: FormData): CollaborationCodeRequestDto {
    return {
        code: String(formData.get('code') ?? '').trim(),
        label: String(formData.get('label') ?? '').trim(),
        discountPercent: Number(formData.get('discountPercent') ?? 0),
        commissionPercent: Number(formData.get('commissionPercent') ?? 0),
        startsAt: localDateTimeOrNull(formData.get('startsAt')),
        endsAt: localDateTimeOrNull(formData.get('endsAt')),
        maxRedemptions: numberOrNull(formData.get('maxRedemptions')),
        ...codeRestrictionsFromFormData(formData),
    };
}

export function collaborationCodePatchFromFormData(formData: FormData, code: CollaborationCodeResponseDto): CollaborationCodePatchDto {
    return {
        label: String(formData.get('label') ?? '').trim(),
        discountPercent: Number(formData.get('discountPercent') ?? 0),
        commissionPercent: Number(formData.get('commissionPercent') ?? 0),
        status: (formData.get('status') as CollaborationCodePatchDto['status']) ?? code.status,
        startsAt: localDateTimeOrNull(formData.get('startsAt')),
        endsAt: localDateTimeOrNull(formData.get('endsAt')),
        maxRedemptions: numberOrNull(formData.get('maxRedemptions')),
        ...codeRestrictionsFromFormData(formData),
    };
}

export function discountCodeCreateFromFormData(formData: FormData): DiscountCodeRequestDto {
    return {
        code: String(formData.get('code') ?? '').trim(),
        label: String(formData.get('label') ?? '').trim(),
        discountPercent: Number(formData.get('discountPercent') ?? 0),
        startsAt: localDateTimeOrNull(formData.get('startsAt')),
        endsAt: localDateTimeOrNull(formData.get('endsAt')),
        maxRedemptions: numberOrNull(formData.get('maxRedemptions')),
        ...codeRestrictionsFromFormData(formData),
    };
}

export function discountCodePatchFromFormData(formData: FormData, code: DiscountCodeResponseDto): DiscountCodePatchDto {
    return {
        label: String(formData.get('label') ?? '').trim(),
        discountPercent: Number(formData.get('discountPercent') ?? 0),
        status: (formData.get('status') as DiscountCodePatchDto['status']) ?? code.status,
        startsAt: localDateTimeOrNull(formData.get('startsAt')),
        endsAt: localDateTimeOrNull(formData.get('endsAt')),
        maxRedemptions: numberOrNull(formData.get('maxRedemptions')),
        ...codeRestrictionsFromFormData(formData),
    };
}

// Unticked boxes mean "every", so an empty list is sent on purpose.
export function codeRestrictionsFromFormData(formData: FormData): CodeRestrictionsDto {
    return {
        eventTypeKeys: formData.getAll('eventTypeKeys').map(String).filter(Boolean),
        planTierCodes: formData.getAll('planTierCodes').map(String).filter(Boolean),
    };
}

// Stored values the option lists don't know about, kept as hidden inputs so an edit
// never silently drops them.
export function unknownRestrictionValues(
    restrictions: CodeRestrictionsDto | null,
    eventTypeKeys: string[],
    planTierCodes: string[],
): CodeRestrictionsDto {
    const knownEventTypes = new Set(eventTypeKeys);
    const knownPlans = new Set(planTierCodes);
    return {
        eventTypeKeys: (restrictions?.eventTypeKeys ?? []).filter((key) => !knownEventTypes.has(key)),
        planTierCodes: (restrictions?.planTierCodes ?? []).filter((code) => !knownPlans.has(code)),
    };
}

export function restrictionEventTypesWithPlans(
    restrictions: CodeRestrictionsDto | null,
    planGroups: { key: string; plans: { value: string }[] }[],
): string[] {
    const keys = new Set(restrictions?.eventTypeKeys ?? []);
    for (const group of planGroups) {
        if (group.plans.some((plan) => restrictions?.planTierCodes.includes(plan.value))) keys.add(group.key);
    }
    return [...keys];
}

export function linkDiscountCodeFromFormData(formData: FormData): LinkDiscountCodeRequestDto {
    return {
        discountCodeId: String(formData.get('discountCodeId') ?? ''),
        commissionPercent: Number(formData.get('commissionPercent') ?? 0),
    };
}

export function localDateTimeOrNull(value: FormDataEntryValue | null): string | null {
    const text = typeof value === 'string' ? value.trim() : '';
    return text ? new Date(text).toISOString() : null;
}

export function instantToLocalInput(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offsetMs = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function numberOrNull(value: FormDataEntryValue | null): number | null {
    const text = typeof value === 'string' ? value.trim() : '';
    return text ? Number(text) : null;
}

export function sortEarningsNewestFirst(earnings: CollaborationEarningResponseDto[]): CollaborationEarningResponseDto[] {
    return [...earnings].sort((left, right) => right.accruedAt.localeCompare(left.accruedAt));
}

// Voiding works per event: an unpaid accrual turns REVERSED, a paid one gets a CLAWBACK row
// for all of it. A partial withdrawal also adds a CLAWBACK (2026-09-30), but only for a share,
// so a clawback alone doesn't mean voided: an event is voided once a row is REVERSED or its
// rows no longer sum above zero. Then none of its rows can be voided again.
export function voidableEarningIds(earnings: CollaborationEarningResponseDto[]): Set<string> {
    const netByEvent = new Map<string, number>();
    const reversedEventIds = new Set<string>();
    for (const earning of earnings) {
        netByEvent.set(earning.eventId, (netByEvent.get(earning.eventId) ?? 0) + earning.amountMinor);
        if (earning.status === 'REVERSED') reversedEventIds.add(earning.eventId);
    }
    const voided = (eventId: string) => reversedEventIds.has(eventId) || (netByEvent.get(eventId) ?? 0) <= 0;
    return new Set(earnings.filter((earning) => earning.entryType === 'ACCRUAL' && !voided(earning.eventId)).map((earning) => earning.id));
}

export type EarningFilter = 'OPEN' | 'ALL' | CollaborationEarningStatus;
export const EARNING_FILTERS: EarningFilter[] = ['OPEN', 'ACCRUED', 'PAID', 'REVERSED', 'ALL'];

export type CurrencyAmount = { currency: string; amountMinor: number };

export function sortCollaboratorsByName(collaborators: CollaboratorResponseDto[]): CollaboratorResponseDto[] {
    return [...collaborators].sort((left, right) => left.name.localeCompare(right.name));
}

export function filterCollaborators(collaborators: CollaboratorResponseDto[], search: string): CollaboratorResponseDto[] {
    const needle = search.trim().toLowerCase();
    if (!needle) return collaborators;
    return collaborators.filter(
        (collaborator) => collaborator.name.toLowerCase().includes(needle) || collaborator.contactEmail.toLowerCase().includes(needle),
    );
}

// Only currencies with something outstanding. Never summed across currencies.
export function owedAmounts(totals: CollaborationEarningsTotalDto[]): CurrencyAmount[] {
    return totals.filter((total) => total.accruedMinor > 0).map((total) => ({ currency: total.currency, amountMinor: total.accruedMinor }));
}

export function sortCodesActiveFirst(codes: CollaborationCodeResponseDto[]): CollaborationCodeResponseDto[] {
    return [...codes].sort((left, right) => Number(left.status !== 'ACTIVE') - Number(right.status !== 'ACTIVE'));
}

export function filterEarnings(earnings: CollaborationEarningResponseDto[], filter: EarningFilter): CollaborationEarningResponseDto[] {
    if (filter === 'ALL') return earnings;
    if (filter === 'OPEN') return earnings.filter((earning) => earning.status !== 'REVERSED');
    return earnings.filter((earning) => earning.status === filter);
}

export function shortId(id: string): string {
    return id.slice(0, 8);
}

export function earningCodeText(codes: CollaborationCodeResponseDto[], codeId: string): string {
    return codes.find((code) => code.id === codeId)?.code ?? shortId(codeId);
}

// Amounts are signed (a clawback is negative), so a plain sum is the payout.
export function sumByCurrency(earnings: CollaborationEarningResponseDto[]): CurrencyAmount[] {
    const sums = new Map<string, number>();
    for (const earning of earnings) sums.set(earning.currency, (sums.get(earning.currency) ?? 0) + earning.amountMinor);
    return [...sums].map(([currency, amountMinor]) => ({ currency, amountMinor })).sort((left, right) => left.currency.localeCompare(right.currency));
}

export function formatCurrencyAmounts(locale: string, amounts: CurrencyAmount[]): string {
    return amounts.map((amount) => formatMoney(locale, amount.amountMinor, amount.currency)).join(' · ');
}

// PATCH is a full replace, so a status change sends the current details back.
export function collaboratorRequestWithStatus(
    collaborator: CollaboratorResponseDto,
    status: CollaboratorResponseDto['status'],
): CollaboratorRequestDto {
    return { name: collaborator.name, contactEmail: collaborator.contactEmail, notes: collaborator.notes, status };
}

// --- Business, invoicing and payout details (2026-10-08) ---

export const BUSINESS_DETAIL_FIELDS = [
    'websiteUrl',
    'contactPersonName',
    'contactPhone',
    'billingEmail',
    'legalName',
    'countryCode',
    'vatNumber',
    'taxOffice',
    'addressLine1',
    'addressLine2',
    'city',
    'postalCode',
    'payoutIban',
    'payoutAccountHolder',
] as const satisfies readonly (keyof CollaboratorBusinessDetailsRequestDto)[];

export type BusinessDetailField = (typeof BUSINESS_DETAIL_FIELDS)[number];

// PUT is a full replacement, so every field is sent each time; an empty one goes as null and clears it.
export function businessDetailsFromFormData(formData: FormData): CollaboratorBusinessDetailsRequestDto {
    const value = (field: BusinessDetailField) => String(formData.get(field) ?? '').trim() || null;
    return {
        websiteUrl: value('websiteUrl'),
        contactPersonName: value('contactPersonName'),
        contactPhone: value('contactPhone'),
        billingEmail: value('billingEmail')?.toLowerCase() ?? null,
        legalName: value('legalName'),
        countryCode: value('countryCode'),
        vatNumber: value('vatNumber'),
        taxOffice: value('taxOffice'),
        addressLine1: value('addressLine1'),
        addressLine2: value('addressLine2'),
        city: value('city'),
        postalCode: value('postalCode'),
        payoutIban: value('payoutIban'),
        payoutAccountHolder: value('payoutAccountHolder'),
    };
}

export type BusinessDetailErrorKey =
    'websiteNotHttps' | 'phoneFormat' | 'emailInvalid' | 'countryWithoutVat' | 'vatWithoutCountry' | 'taxOfficeRequired' | 'ibanInvalid' | 'invalid';
export type BusinessDetailErrors = Partial<Record<BusinessDetailField, BusinessDetailErrorKey>>;

const E164 = /^\+[1-9]\d{6,14}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isHttpsUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && url.hostname.length > 0;
    } catch {
        return false;
    }
}

export function normalizeIban(value: string): string {
    return value.replace(/[\s-]/g, '').toUpperCase();
}

// ISO 13616 mod-97 checksum. The backend validates too; this only spares a round trip.
export function isValidIban(value: string): boolean {
    const iban = normalizeIban(value);
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
    const digits = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (letter) => String(letter.charCodeAt(0) - 55));
    let remainder = 0;
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
    return remainder === 1;
}

export function formatIban(value: string): string {
    return normalizeIban(value).replace(/(.{4})(?=.)/g, '$1 ');
}

// The backend's format rules, checked before the save so the admin sees which field is wrong.
export function businessDetailsErrors(input: CollaboratorBusinessDetailsRequestDto): BusinessDetailErrors {
    const errors: BusinessDetailErrors = {};
    if (input.websiteUrl && !isHttpsUrl(input.websiteUrl)) errors.websiteUrl = 'websiteNotHttps';
    if (input.contactPhone && !E164.test(input.contactPhone.replace(/[\s\-()]/g, ''))) errors.contactPhone = 'phoneFormat';
    if (input.billingEmail && !EMAIL.test(input.billingEmail)) errors.billingEmail = 'emailInvalid';
    if (input.countryCode && !input.vatNumber) errors.vatNumber = 'countryWithoutVat';
    if (!input.countryCode && input.vatNumber) errors.countryCode = 'vatWithoutCountry';
    if (input.countryCode === 'EL' && input.vatNumber && !input.taxOffice) errors.taxOffice = 'taxOfficeRequired';
    if (input.payoutIban && !isValidIban(input.payoutIban)) errors.payoutIban = 'ibanInvalid';
    return errors;
}

// A 400 from bean validation names its fields; the service's own format checks don't, so
// rejectedBusinessDetails tells the form to show a general message instead.
export function serverBusinessDetailErrors(error: unknown): BusinessDetailErrors {
    const fields = getFieldErrors(error) ?? {};
    const errors: BusinessDetailErrors = {};
    for (const field of BUSINESS_DETAIL_FIELDS) if (field in fields) errors[field] = 'invalid';
    return errors;
}

export function rejectedBusinessDetails(error: unknown): boolean {
    return getErrorCode(error) === ERROR_CODES.VALIDATION_FAILED;
}

export function hasBusinessDetailErrors(errors: BusinessDetailErrors): boolean {
    return Object.keys(errors).length > 0;
}

// The VIES prefix plus the stored number, or null when there is none.
export function collaboratorVatText(collaborator: Pick<CollaboratorResponseDto, 'countryCode' | 'vatNumber'>): string | null {
    return collaborator.vatNumber ? `${collaborator.countryCode ?? ''}${collaborator.vatNumber}` : null;
}

export function collaboratorAddressText(
    collaborator: Pick<CollaboratorResponseDto, 'addressLine1' | 'addressLine2' | 'postalCode' | 'city'>,
): string | null {
    const cityLine = [collaborator.postalCode, collaborator.city].filter(Boolean).join(' ');
    return [collaborator.addressLine1, collaborator.addressLine2, cityLine].filter(Boolean).join(', ') || null;
}

// missingPayoutFields sends column names; these are the matching label keys.
const MISSING_PAYOUT_FIELD_LABELS: Record<string, BusinessDetailField | 'viesStatus'> = {
    legal_name: 'legalName',
    country_code: 'countryCode',
    vat_number: 'vatNumber',
    tax_office: 'taxOffice',
    address_line1: 'addressLine1',
    city: 'city',
    postal_code: 'postalCode',
    payout_iban: 'payoutIban',
    payout_account_holder: 'payoutAccountHolder',
    vies_status: 'viesStatus',
};

// null for a column this build doesn't know yet; the caller shows it as sent.
export function missingPayoutFieldLabelKey(column: string): BusinessDetailField | 'viesStatus' | null {
    return MISSING_PAYOUT_FIELD_LABELS[column] ?? null;
}

// --- Tiered commission (2026-10-08) ---

export const MAX_COMMISSION_TIERS = 10;

export type CommissionTierDraft = { key: string; minActivations: string; commissionPercent: string };

export type CommissionTierErrorKey =
    'tooMany' | 'activationsWhole' | 'percentRange' | 'firstStartsAtOne' | 'thresholdsIncrease' | 'ratesNeverDecrease';

export function commissionTierDrafts(tiers: CommissionTierDto[]): CommissionTierDraft[] {
    return tiers.map((tier, index) => ({
        key: `tier-${index}`,
        minActivations: String(tier.minActivations),
        commissionPercent: String(tier.commissionPercent),
    }));
}

function wholeNumber(text: string): number {
    const trimmed = text.trim();
    return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}

export function commissionTiersFromDrafts(drafts: CommissionTierDraft[]): CommissionTierDto[] {
    return drafts.map((draft) => ({
        minActivations: wholeNumber(draft.minActivations),
        commissionPercent: wholeNumber(draft.commissionPercent),
    }));
}

// The first broken rule, or null. [] is valid: it removes the schedule.
export function commissionTiersError(tiers: CommissionTierDto[]): CommissionTierErrorKey | null {
    if (tiers.length > MAX_COMMISSION_TIERS) return 'tooMany';
    if (tiers.some((tier) => !Number.isInteger(tier.minActivations) || tier.minActivations < 1)) return 'activationsWhole';
    if (tiers.some((tier) => !Number.isInteger(tier.commissionPercent) || tier.commissionPercent < 1 || tier.commissionPercent > 100)) {
        return 'percentRange';
    }
    if (tiers.length > 0 && tiers[0].minActivations !== 1) return 'firstStartsAtOne';
    for (let index = 1; index < tiers.length; index++) {
        if (tiers[index].minActivations <= tiers[index - 1].minActivations) return 'thresholdsIncrease';
        if (tiers[index].commissionPercent < tiers[index - 1].commissionPercent) return 'ratesNeverDecrease';
    }
    return null;
}

// A new row starts after the last one, at the same rate, so adding one never breaks the schedule.
export function nextCommissionTierDraft(drafts: CommissionTierDraft[], key: string): CommissionTierDraft {
    const last = commissionTiersFromDrafts(drafts.slice(-1))[0];
    if (!last) return { key, minActivations: '1', commissionPercent: '' };
    return {
        key,
        minActivations: Number.isInteger(last.minActivations) ? String(last.minActivations + 1) : '',
        commissionPercent: Number.isInteger(last.commissionPercent) ? String(last.commissionPercent) : '',
    };
}

// Where a tier ends: the activation before the next one starts, or null for the top tier.
export function commissionTierEnd(tiers: CommissionTierDto[], index: number): number | null {
    const next = tiers[index + 1];
    return next ? next.minActivations - 1 : null;
}

// The tier the partner's next activation falls in, or -1 without a schedule.
export function currentCommissionTierIndex(tiers: CommissionTierDto[], activationsThisYear: number): number {
    const nextActivation = activationsThisYear + 1;
    return tiers.reduce((current, tier, index) => (tier.minActivations <= nextActivation ? index : current), -1);
}
