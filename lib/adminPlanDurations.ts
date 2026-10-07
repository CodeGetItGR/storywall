import { priceInputToMinor, priceMinorToInput } from '@/lib/adminPlanForm';
import type { CoverageOptionPatchDto, CoverageOptionResponseDto } from '@/lib/api/types';

export const MIN_DURATION_MONTHS = 1;
export const MAX_DURATION_MONTHS = 120;

// One duration being added or edited in the plan editor. `optionId` is null for
// a new one. Fields are the raw input text so a half-typed value stays editable.
// `promoPrice` is blank for none: it is what the duration costs while the
// plan's promotion window is open, in place of the plan's percent.
export type DurationDraft = {
    optionId: string | null;
    months: string;
    price: string;
    promoPrice: string;
};

// Live durations first, in the order hosts see them; retired ones after.
export function sortDurationsForAdmin(options: CoverageOptionResponseDto[]): CoverageOptionResponseDto[] {
    return [...options].sort(
        (left, right) => Number(right.active) - Number(left.active) || left.sortOrder - right.sortOrder || left.months - right.months,
    );
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

// A promo price must sit above zero and below the duration's price (the server
// refuses anything else with 5151). Blank is valid: no promo price.
export function isDurationPromoPriceValid(promoText: string, price: number | null): boolean {
    if (!promoText.trim()) return true;
    const promo = parseDurationPrice(promoText);
    return promo !== null && promo > 0 && price !== null && promo < price;
}

export function newDurationDraft(): DurationDraft {
    return { optionId: null, months: '', price: '', promoPrice: '' };
}

export function durationDraftFromOption(option: CoverageOptionResponseDto): DurationDraft {
    return {
        optionId: option.id,
        months: String(option.months),
        price: priceMinorToInput(option.priceAmountMinor),
        promoPrice: priceMinorToInput(option.promoPriceAmountMinor),
    };
}

export function isDurationDraftValid(draft: DurationDraft): boolean {
    const monthsValid = draft.optionId !== null || parseDurationMonths(draft.months) !== null;
    const price = parseDurationPrice(draft.price);
    return monthsValid && price !== null && isDurationPromoPriceValid(draft.promoPrice, price);
}

// The promo price to send with a new duration: null when left blank.
export function durationPromoPriceFromDraft(draft: DurationDraft): number | null {
    return draft.promoPrice.trim() ? parseDurationPrice(draft.promoPrice) : null;
}

// Only what changed: `kind` and `months` are fixed once an option exists.
export function durationPatchFromDraft(option: CoverageOptionResponseDto, draft: DurationDraft): CoverageOptionPatchDto {
    const patch: CoverageOptionPatchDto = {};
    const price = parseDurationPrice(draft.price);
    if (price !== null && price !== option.priceAmountMinor) patch.priceAmountMinor = price;

    const promo = durationPromoPriceFromDraft(draft);
    if (promo === null && option.promoPriceAmountMinor !== null) patch.clearPromoPrice = true;
    else if (promo !== null && promo !== option.promoPriceAmountMinor) patch.promoPriceAmountMinor = promo;
    return patch;
}
