import type { CoverageOptionResponseDto, EventTypeConvention, PlanTierResponseDto } from '@/lib/api/types';
import { publicAssignablePlans } from '@/lib/planTiers';

// The landing page's tabs come from /api/config.landingCategories. A tab lists the public EVENT
// plans of all its types: by type (the category's order), then plan sortOrder. Copies of a plan
// duplicated to several types share a sharedGroupKey and show once — but only while they still
// sell the same thing, so the landing never shows a price checkout won't charge. Copies that have
// drifted apart stay separate cards and are reported, for the admin panel's warning.
// See docs/superpowers/specs/2026-10-06-landing-categories-design.md §5.2.

export type DriftedGroup = { sharedGroupKey: string; planCodes: string[] };
export type LandingCategoryPlans = { plans: PlanTierResponseDto[]; driftedGroups: DriftedGroup[] };

export function resolveLandingCategoryPlans(plans: PlanTierResponseDto[], eventTypeKeys: readonly EventTypeConvention[]): LandingCategoryPlans {
    const eventPlans = publicAssignablePlans(plans, 'EVENT');
    const ordered = eventTypeKeys.flatMap((eventTypeKey) => eventPlans.filter((plan) => plan.eventTypeKey === eventTypeKey));

    const shown: PlanTierResponseDto[] = [];
    for (const plan of ordered) {
        const sameOfferShown =
            plan.sharedGroupKey !== null &&
            shown.some((other) => other.sharedGroupKey === plan.sharedGroupKey && offerSignature(other) === offerSignature(plan));
        if (!sameOfferShown) shown.push(plan);
    }

    const byGroup = new Map<string, string[]>();
    for (const plan of shown) {
        if (plan.sharedGroupKey === null) continue;
        byGroup.set(plan.sharedGroupKey, [...(byGroup.get(plan.sharedGroupKey) ?? []), plan.code]);
    }
    const driftedGroups = [...byGroup.entries()]
        .filter(([, codes]) => codes.length > 1)
        .map(([sharedGroupKey, planCodes]) => ({ sharedGroupKey, planCodes }));

    return { plans: shown, driftedGroups };
}

// Everything a visitor can tell apart on the card or at checkout.
function offerSignature(plan: PlanTierResponseDto): string {
    const options = (list: CoverageOptionResponseDto[]) =>
        list
            .filter((option) => option.active)
            .map((option) => [option.months, option.priceAmountMinor])
            .toSorted((left, right) => left[0] - right[0] || left[1] - right[1]);
    return stableStringify({
        currency: plan.priceCurrency,
        initial: options(plan.initialOptions),
        extension: options(plan.extensionOptions),
        discount: [plan.discountPercent, plan.discountStartsAt, plan.discountEndsAt],
        modules: [...plan.moduleKeys].sort(),
        moduleConfigs: plan.moduleConfigs ?? {},
    });
}

function stableStringify(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if (value !== null && typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>).toSorted(([left], [right]) => left.localeCompare(right));
        return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`;
    }
    return JSON.stringify(value);
}
