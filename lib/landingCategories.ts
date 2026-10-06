import type { CoverageOptionResponseDto, EventTypeConvention, PlanTierResponseDto } from '@/lib/api/types';
import { isLandingPlanOnSale } from '@/lib/landingPricing';
import { activeRoleCount, type MemberRoleCatalog } from '@/lib/memberRoles';
import { publicAssignablePlans } from '@/lib/planTiers';

// The landing page's tabs come from /api/config.landingCategories. A tab lists the public EVENT
// plans on sale of all its types: by type (the category's order), then plan sortOrder. Copies of a
// plan duplicated to several types share a sharedGroupKey and show once — but only while they
// still sell the same thing, so the landing never shows a price checkout won't charge. Copies that
// have drifted apart stay separate cards and are reported, with what differs, for the admin
// panel's warning. A plan with nothing on sale gets no card, so it neither represents a group nor
// counts as drift.
// See docs/superpowers/specs/2026-10-06-landing-categories-design.md §5.2.

export type DriftField =
    | 'price'
    | 'currency'
    | 'durations'
    | 'extensions'
    | 'discount'
    | 'discountLabel'
    | 'modules'
    | 'moduleConfigs'
    | 'storage'
    | 'guests'
    | 'name'
    | 'memberRoles';
export type DriftedGroup = { sharedGroupKey: string; planCodes: string[]; differingFields: DriftField[] };
export type LandingCategoryPlans = { plans: PlanTierResponseDto[]; driftedGroups: DriftedGroup[] };

export function resolveLandingCategoryPlans(
    plans: PlanTierResponseDto[],
    eventTypeKeys: readonly EventTypeConvention[],
    memberRoles: MemberRoleCatalog,
): LandingCategoryPlans {
    const eventPlans = publicAssignablePlans(plans, 'EVENT').filter(isLandingPlanOnSale);
    const ordered = eventTypeKeys.flatMap((eventTypeKey) => eventPlans.filter((plan) => plan.eventTypeKey === eventTypeKey));

    const signatureOf = (plan: PlanTierResponseDto) => stableStringify(offerFields(plan, memberRoles));
    const shown: PlanTierResponseDto[] = [];
    for (const plan of ordered) {
        const sameOfferShown =
            plan.sharedGroupKey !== null &&
            shown.some((other) => other.sharedGroupKey === plan.sharedGroupKey && signatureOf(other) === signatureOf(plan));
        if (!sameOfferShown) shown.push(plan);
    }

    const byGroup = new Map<string, PlanTierResponseDto[]>();
    for (const plan of shown) {
        if (plan.sharedGroupKey === null) continue;
        byGroup.set(plan.sharedGroupKey, [...(byGroup.get(plan.sharedGroupKey) ?? []), plan]);
    }
    const driftedGroups = [...byGroup.entries()]
        .filter(([, copies]) => copies.length > 1)
        .map(([sharedGroupKey, copies]) => ({
            sharedGroupKey,
            planCodes: copies.map((copy) => copy.code),
            differingFields: differingFields(copies.map((copy) => offerFields(copy, memberRoles))),
        }));

    return { plans: shown, driftedGroups };
}

// In the order the admin warning names them.
const DRIFT_FIELDS: DriftField[] = [
    'price',
    'currency',
    'durations',
    'extensions',
    'discount',
    'discountLabel',
    'modules',
    'moduleConfigs',
    'storage',
    'guests',
    'name',
    'memberRoles',
];

type OptionPair = [months: number, amountMinor: number];
type OfferFields = Record<Exclude<DriftField, 'price'>, unknown> & { price: OptionPair[] };

// Everything a visitor can tell apart on the card or at checkout. A field the card shows must be
// here, or copies that differ in it would merge and the landing would show only one of them.
// price is the active initial options as [months, amount]; durations their months alone.
function offerFields(plan: PlanTierResponseDto, memberRoles: MemberRoleCatalog): OfferFields {
    const options = (list: CoverageOptionResponseDto[]) =>
        list
            .filter((option) => option.active)
            .map((option): OptionPair => [option.months, option.priceAmountMinor])
            .toSorted((left, right) => left[0] - right[0] || left[1] - right[1]);
    const initial = options(plan.initialOptions);
    return {
        price: initial,
        currency: plan.priceCurrency,
        durations: initial.map(([months]) => months),
        extensions: options(plan.extensionOptions),
        discount: [plan.discountPercent, plan.discountStartsAt, plan.discountEndsAt],
        discountLabel: plan.discountLabel,
        modules: [...plan.moduleKeys].sort(),
        moduleConfigs: plan.moduleConfigs ?? {},
        storage: plan.storageBytes,
        guests: plan.maxMembers,
        name: plan.name,
        // The card's role line counts the type's active roles, so copies of different types can
        // read differently. Only a plan with the module shows the line.
        memberRoles: plan.moduleKeys.includes('member_roles') ? activeRoleCount(memberRoles, plan.eventTypeKey) : null,
    };
}

// What tells the copies apart, each compared with the first. When the durations differ, a price
// counts only for a duration both sell: one only a copy sells is reported as durations.
function differingFields([first, ...rest]: OfferFields[]): DriftField[] {
    return DRIFT_FIELDS.filter((field) => rest.some((other) => (field === 'price' ? pricesDiffer(first, other) : !same(first[field], other[field]))));
}

function pricesDiffer(left: OfferFields, right: OfferFields): boolean {
    if (same(left.durations, right.durations)) return !same(left.price, right.price);
    return left.price.some(([months, amount]) => right.price.some(([otherMonths, otherAmount]) => otherMonths === months && otherAmount !== amount));
}

function same(left: unknown, right: unknown): boolean {
    return stableStringify(left) === stableStringify(right);
}

function stableStringify(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if (value !== null && typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>).toSorted(([left], [right]) => left.localeCompare(right));
        return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`;
    }
    return JSON.stringify(value);
}
