import type {
    CodeRestrictionsDto,
    CollaborationCodePatchDto,
    CollaborationCodeRequestDto,
    CollaborationCodeResponseDto,
    CollaborationEarningResponseDto,
    CollaborationEarningStatus,
    CollaborationEarningsTotalDto,
    CollaboratorRequestDto,
    CollaboratorResponseDto,
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

// Voiding works per event: an unpaid accrual turns REVERSED, a paid one gets a CLAWBACK row.
// Either mark means the event is already voided, so none of its rows can be voided again.
export function voidableEarningIds(earnings: CollaborationEarningResponseDto[]): Set<string> {
    const voidedEventIds = new Set(
        earnings.filter((earning) => earning.entryType === 'CLAWBACK' || earning.status === 'REVERSED').map((earning) => earning.eventId),
    );
    return new Set(
        earnings.filter((earning) => earning.entryType === 'ACCRUAL' && !voidedEventIds.has(earning.eventId)).map((earning) => earning.id),
    );
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
    return [...sums]
        .map(([currency, amountMinor]) => ({ currency, amountMinor }))
        .sort((left, right) => left.currency.localeCompare(right.currency));
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
