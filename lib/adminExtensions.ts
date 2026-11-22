import { parseDurationMonths, parseDurationPrice } from '@/lib/adminPlanDurations';
import { priceMinorToInput } from '@/lib/adminPlanForm';
import type { Visibility } from '@/lib/adminVisibility';
import type { CoverageOptionResponseDto, PlanTierResponseDto } from '@/lib/api/types';

// A coverage extension as the Paid services page lists it. Extensions are not
// paid services on the server: each one is an EXTENSION coverage option of one
// EVENT plan, read off that plan's `extensionOptions`.
export type ExtensionRow = {
    option: CoverageOptionResponseDto;
    plan: PlanTierResponseDto;
};

// The extension being added or edited. Fields hold the raw input text so a
// half-typed value stays editable. Plan and months are fixed after creation.
export type ExtensionDraft = {
    planTierId: string;
    months: string;
    price: string;
};

// On sale reads as Live and retired as Archived, so the page's status filter
// and counts cover extensions too. An extension is never hidden.
export function extensionVisibility(option: CoverageOptionResponseDto): Visibility {
    return option.active ? 'LIVE' : 'ARCHIVED';
}

// Every extension of every plan: plans in the order given, each plan's
// extensions shortest first, which is the order hosts see them in.
export function extensionRowsFromPlans(plans: PlanTierResponseDto[]): ExtensionRow[] {
    return plans.flatMap((plan) =>
        [...(plan.extensionOptions ?? [])].sort((left, right) => left.months - right.months).map((option) => ({ option, plan })),
    );
}

export function newExtensionDraft(plans: PlanTierResponseDto[]): ExtensionDraft {
    return { planTierId: plans[0]?.id ?? '', months: '', price: '' };
}

export function extensionDraftFromRow(row: ExtensionRow): ExtensionDraft {
    return { planTierId: row.plan.id, months: String(row.option.months), price: priceMinorToInput(row.option.priceAmountMinor) };
}

// An extension always costs something: a free one is refused here.
export function parseExtensionPrice(text: string): number | null {
    const price = parseDurationPrice(text);
    return price !== null && price > 0 ? price : null;
}

export function isExtensionDraftValid(draft: ExtensionDraft): boolean {
    return Boolean(draft.planTierId) && parseDurationMonths(draft.months) !== null && parseExtensionPrice(draft.price) !== null;
}

// The extensions the table shows under the page's filters. Search matches the
// plan's name or code, or the length typed as a number.
export function filterExtensionRows(
    rows: ExtensionRow[],
    { kind, status, search }: { kind: string; status: Visibility | 'ALL'; search: string },
): ExtensionRow[] {
    if (kind !== 'ALL' && kind !== 'EXTENSION') return [];
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
        if (status !== 'ALL' && extensionVisibility(row.option) !== status) return false;
        if (!needle) return true;
        return row.plan.name.toLowerCase().includes(needle) || row.plan.code.toLowerCase().includes(needle) || String(row.option.months) === needle;
    });
}
