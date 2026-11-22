import { parseDurationMonths, parseDurationPrice } from '@/lib/adminPlanDurations';
import { priceMinorToInput } from '@/lib/adminPlanForm';
import { type Visibility, visibilityOf } from '@/lib/adminVisibility';
import type { CoverageOptionResponseDto, PaidServiceResponseDto, PlanTierResponseDto } from '@/lib/api/types';

// A coverage extension as the Paid services page lists it. Extensions are not
// paid services on the server: each one is an EXTENSION coverage option of one
// EVENT plan, read off that plan's `extensionOptions`.
export type ExtensionRow = {
    option: CoverageOptionResponseDto;
    plan: PlanTierResponseDto;
};

// The extension being added or edited. Fields hold the raw input text so a
// half-typed value stays editable. A new extension can go on several plans at
// once; an existing one belongs to one plan, and its plan and months are fixed.
export type ExtensionDraft = {
    planTierIds: string[];
    months: string;
    price: string;
};

// The plans of one event type, in the picker and the table's plan filter.
export type ExtensionPlanGroup = {
    eventTypeKey: string;
    plans: PlanTierResponseDto[];
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

// Plans grouped by event type, the types in the order given, plans in their own
// sort order. A type missing from the order goes last. Archived plans are left
// out: they can't be bought, so an extension on one would never be sold.
export function extensionPlanGroups(plans: PlanTierResponseDto[], eventTypeOrder: string[]): ExtensionPlanGroup[] {
    const groups = new Map<string, PlanTierResponseDto[]>();
    for (const plan of [...plans].sort((left, right) => left.sortOrder - right.sortOrder)) {
        if (visibilityOf(plan) === 'ARCHIVED') continue;
        const key = plan.eventTypeKey ?? '';
        groups.set(key, [...(groups.get(key) ?? []), plan]);
    }
    const rank = (key: string) => {
        const index = eventTypeOrder.indexOf(key);
        return index === -1 ? eventTypeOrder.length : index;
    };
    return [...groups.entries()]
        .sort(([left], [right]) => rank(left) - rank(right))
        .map(([eventTypeKey, groupPlans]) => ({ eventTypeKey, plans: groupPlans }));
}

// The plans that already sell the typed length on sale. They can't be picked:
// the server allows one live extension per length on a plan.
export function plansSellingLength(plans: PlanTierResponseDto[], monthsText: string): Set<string> {
    const months = parseDurationMonths(monthsText);
    if (months === null) return new Set();
    return new Set(
        plans.filter((plan) => (plan.extensionOptions ?? []).some((option) => option.active && option.months === months)).map((plan) => plan.id),
    );
}

export function newExtensionDraft(): ExtensionDraft {
    return { planTierIds: [], months: '', price: '' };
}

export function extensionDraftFromRow(row: ExtensionRow): ExtensionDraft {
    return { planTierIds: [row.plan.id], months: String(row.option.months), price: priceMinorToInput(row.option.priceAmountMinor) };
}

// An extension always costs something: a free one is refused here.
export function parseExtensionPrice(text: string): number | null {
    const price = parseDurationPrice(text);
    return price !== null && price > 0 ? price : null;
}

export function isExtensionDraftValid(draft: ExtensionDraft): boolean {
    return draft.planTierIds.length > 0 && parseDurationMonths(draft.months) !== null && parseExtensionPrice(draft.price) !== null;
}

// The extensions the table shows under the page's filters. Search matches the
// plan's name or code, or the length typed as a number.
export function filterExtensionRows(
    rows: ExtensionRow[],
    { kind, status, search, planId = null }: { kind: string; status: Visibility | 'ALL'; search: string; planId?: string | null },
): ExtensionRow[] {
    if (kind !== 'ALL' && kind !== 'EXTENSION') return [];
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
        if (planId && row.plan.id !== planId) return false;
        if (status !== 'ALL' && extensionVisibility(row.option) !== status) return false;
        if (!needle) return true;
        return row.plan.name.toLowerCase().includes(needle) || row.plan.code.toLowerCase().includes(needle) || String(row.option.months) === needle;
    });
}

// Whether a plan's hosts can buy the service: one offered to no plan in
// particular is offered to every plan.
export function serviceOffersPlan(service: Pick<PaidServiceResponseDto, 'planTierIds'>, planId: string | null): boolean {
    return !planId || service.planTierIds.length === 0 || service.planTierIds.includes(planId);
}
