import { priceInputToMinor, priceMinorToInput } from '@/lib/adminPlanForm';
import type { CoverageOptionPatchDto, CoverageOptionResponseDto } from '@/lib/api/types';

export const MIN_DURATION_MONTHS = 1;
export const MAX_DURATION_MONTHS = 120;

// One duration being added or edited in the plan editor. `optionId` is null for
// a new one. Fields are the raw input text so a half-typed value stays editable.
export type DurationDraft = {
    optionId: string | null;
    months: string;
    price: string;
    sortOrder: string;
};

// Live durations first, in the order hosts see them; retired ones after.
export function sortDurationsForAdmin(options: CoverageOptionResponseDto[]): CoverageOptionResponseDto[] {
    return [...options].sort(
        (left, right) => Number(right.active) - Number(left.active) || left.sortOrder - right.sortOrder || left.months - right.months,
    );
}

export function nextDurationSortOrder(options: CoverageOptionResponseDto[]): number {
    return Math.max(-1, ...options.map((option) => option.sortOrder)) + 1;
}

export function parseDurationMonths(text: string): number | null {
    if (!/^\d+$/.test(text.trim())) return null;
    const months = Number(text);
    return months >= MIN_DURATION_MONTHS && months <= MAX_DURATION_MONTHS ? months : null;
}

export function parseDurationPrice(text: string): number | null {
    const amount = priceInputToMinor(text);
    return amount !== null && Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function parseSortOrder(text: string): number | null {
    return /^\d+$/.test(text.trim()) ? Number(text) : null;
}

export function newDurationDraft(options: CoverageOptionResponseDto[]): DurationDraft {
    return { optionId: null, months: '', price: '', sortOrder: String(nextDurationSortOrder(options)) };
}

export function durationDraftFromOption(option: CoverageOptionResponseDto): DurationDraft {
    return {
        optionId: option.id,
        months: String(option.months),
        price: priceMinorToInput(option.priceAmountMinor),
        sortOrder: String(option.sortOrder),
    };
}

export function isDurationDraftValid(draft: DurationDraft): boolean {
    const monthsValid = draft.optionId !== null || parseDurationMonths(draft.months) !== null;
    return monthsValid && parseDurationPrice(draft.price) !== null && parseSortOrder(draft.sortOrder) !== null;
}

// Only what changed: `kind` and `months` are fixed once an option exists.
export function durationPatchFromDraft(option: CoverageOptionResponseDto, draft: DurationDraft): CoverageOptionPatchDto {
    const patch: CoverageOptionPatchDto = {};
    const price = parseDurationPrice(draft.price);
    const sortOrder = parseSortOrder(draft.sortOrder);
    if (price !== null && price !== option.priceAmountMinor) patch.priceAmountMinor = price;
    if (sortOrder !== null && sortOrder !== option.sortOrder) patch.sortOrder = sortOrder;
    return patch;
}
