import type {
    CodeRestrictionsDto,
    CollaborationCodePatchDto,
    CollaborationCodeRequestDto,
    CollaborationCodeResponseDto,
    CollaborationEarningResponseDto,
    CollaborationEarningsTotalDto,
    CollaboratorRequestDto,
    CollaboratorResponseDto,
    DiscountCodePatchDto,
    DiscountCodeRequestDto,
    DiscountCodeResponseDto,
    LinkDiscountCodeRequestDto,
} from '@/lib/api/types';

export function collaboratorRequestFromFormData(formData: FormData, existing?: CollaboratorResponseDto): CollaboratorRequestDto {
    return {
        name: String(formData.get('name') ?? '').trim(),
        contactEmail: String(formData.get('contactEmail') ?? '')
            .trim()
            .toLowerCase(),
        notes: String(formData.get('notes') ?? '').trim() || null,
        status: (formData.get('status') as CollaboratorRequestDto['status']) ?? existing?.status ?? 'ACTIVE',
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

export function collaboratorStats(collaborators: CollaboratorResponseDto[]) {
    return collaborators.reduce(
        (stats, collaborator) => {
            stats.total += 1;
            if (collaborator.status === 'ACTIVE') stats.active += 1;
            else stats.suspended += 1;
            if (collaborator.portalTokenIssued) stats.portalLinks += 1;
            return stats;
        },
        { total: 0, active: 0, suspended: 0, portalLinks: 0 },
    );
}

export function owedMinor(total: CollaborationEarningsTotalDto): number {
    return total.accruedMinor;
}

export function balanceMinor(total: CollaborationEarningsTotalDto): number {
    return total.accruedMinor - total.paidMinor;
}

export function sortEarningsNewestFirst(earnings: CollaborationEarningResponseDto[]): CollaborationEarningResponseDto[] {
    return [...earnings].sort((left, right) => right.accruedAt.localeCompare(left.accruedAt));
}
