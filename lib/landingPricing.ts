import type {
    AppMediaConfigDto,
    CoverageOptionResponseDto,
    EventTypeConvention,
    PlanTierResponseDto,
    PlatformModuleResponseDto,
} from '@/lib/api/types';
import { discountedAmountMinor } from '@/lib/billing';
import { formatBytes } from '@/lib/format';
import { mediaEstimate } from '@/lib/planComparison';
import { enabledModuleKeys } from '@/lib/planModules';
import { liveInitialOptions, publicAssignablePlans, shortestInitialOption } from '@/lib/planTiers';

export type LandingPricingCategoryKey = 'wedding' | 'vip';

// The two landing tabs don't correspond 1:1 to a BE eventTypeKey. Each entry
// is an ordered list of candidate types for that tab — resolveLandingCategoryPlans
// uses the first one that actually has plans, it never merges plans from two
// types into one tab. See docs/superpowers/plans/2026-09-18-landing-pricing-dynamic-plans.md.
export const LANDING_PRICING_CATEGORY_EVENT_TYPES: Record<LandingPricingCategoryKey, EventTypeConvention[]> = {
    wedding: ['WEDDING', 'BAPTISM'],
    vip: ['SOCIAL_EVENT'],
};

// One length a plan is sold at, with its price already formatted for the card.
export type LandingPlanDuration = {
    id: string;
    months: number;
    price: string;
};

export type LandingPlan = {
    code: string;
    audience: string;
    features: string[];
    includedFeatures?: string[];
    name: string;
    photos: string;
    storage: string;
    videos: string;
    // In display order. The card shows the price of the one picked, and starts
    // on defaultDurationId (the shortest).
    durations: LandingPlanDuration[];
    defaultDurationId: string;
};

export interface LandingPlanCopy {
    baselineFeatures: string[];
    everythingIn: (planName: string) => string;
    guestsUnlimited: string;
    guestsUpTo: (count: number) => string;
    mediaUnlimited: string;
    storageUnlimited: string;
}

export function resolveLandingCategoryPlans(plans: PlanTierResponseDto[], category: LandingPricingCategoryKey): PlanTierResponseDto[] {
    const eventPlans = publicAssignablePlans(plans, 'EVENT');

    for (const eventTypeKey of LANDING_PRICING_CATEGORY_EVENT_TYPES[category]) {
        const forType = eventPlans.filter((plan) => plan.eventTypeKey === eventTypeKey).sort((left, right) => left.sortOrder - right.sortOrder);
        if (forType.length > 0) return forType;
    }

    return [];
}

// One duration's price after the plan's promotion. Mirrors the landing page's
// existing static style exactly: a whole euro amount with a suffixed symbol and
// no decimals ("79€"), not Intl.NumberFormat's default currency rendering
// (which would print "€79.00" or add locale-specific spacing/decimals and
// change the visual design).
export function formatLandingOptionPrice(plan: PlanTierResponseDto, option: CoverageOptionResponseDto): string | null {
    if (!plan.priceCurrency) return null;

    const amount = discountedAmountMinor(option.priceAmountMinor, plan) / 100;
    if (plan.priceCurrency === 'EUR' && Number.isInteger(amount)) return `${amount}€`;

    return new Intl.NumberFormat(undefined, { style: 'currency', currency: plan.priceCurrency }).format(amount);
}

// The duration a card shows: the one picked, else the plan's default.
export function pickedLandingDuration(plan: LandingPlan, durationId: string | null | undefined): LandingPlanDuration {
    return (
        plan.durations.find((duration) => duration.id === durationId) ??
        plan.durations.find((duration) => duration.id === plan.defaultDurationId) ??
        plan.durations[0]
    );
}

function landingDurations(plan: PlanTierResponseDto): LandingPlanDuration[] {
    return liveInitialOptions(plan).flatMap((option) => {
        const price = formatLandingOptionPrice(plan, option);
        return price === null ? [] : [{ id: option.id, months: option.months, price }];
    });
}

function sortedModuleNames(moduleKeys: string[], modules: PlatformModuleResponseDto[], moduleName: (moduleKey: string) => string): string[] {
    const sortOrderByKey = new Map(modules.map((module_) => [module_.moduleKey, module_.sortOrder]));
    return enabledModuleKeys(moduleKeys, modules)
        .slice()
        .sort((left, right) => (sortOrderByKey.get(left) ?? 0) - (sortOrderByKey.get(right) ?? 0))
        .map(moduleName);
}

// Builds one landing pricing card from a plan tier plus the tier directly
// below it in the same tab (already sorted by sortOrder — see
// resolveLandingCategoryPlans). Each tier after the first rolls up the
// previous card and lists only its additional modules, so catalog rows do not
// need to repeat every inherited module. Returns null for a plan with no
// duration on sale — it can't be bought, so it doesn't belong on a pricing
// card or in the creation picker.
export function buildLandingPlan(
    plan: PlanTierResponseDto,
    previousPlan: PlanTierResponseDto | undefined,
    modules: PlatformModuleResponseDto[],
    media: AppMediaConfigDto,
    moduleName: (moduleKey: string) => string,
    copy: LandingPlanCopy,
    inheritedModuleKeys?: string[],
): LandingPlan | null {
    const durations = landingDurations(plan);
    const defaultDuration = shortestInitialOption(plan);
    if (durations.length === 0 || !defaultDuration) return null;

    const estimate = mediaEstimate(plan.storageBytes, media);
    const inheritedKeys = [...new Set(inheritedModuleKeys ?? previousPlan?.moduleKeys ?? [])];
    const features = previousPlan
        ? [
              copy.everythingIn(previousPlan.name),
              ...sortedModuleNames(
                  plan.moduleKeys.filter((moduleKey) => !inheritedKeys.includes(moduleKey)),
                  modules,
                  moduleName,
              ),
          ]
        : [...copy.baselineFeatures, ...sortedModuleNames(plan.moduleKeys, modules, moduleName)];

    return {
        code: plan.code,
        audience: plan.maxMembers === null ? copy.guestsUnlimited : copy.guestsUpTo(plan.maxMembers),
        features,
        includedFeatures: previousPlan ? [...copy.baselineFeatures, ...sortedModuleNames(inheritedKeys, modules, moduleName)] : undefined,
        name: plan.name,
        photos: estimate?.images ?? copy.mediaUnlimited,
        storage: plan.storageBytes === null ? copy.storageUnlimited : formatBytes(plan.storageBytes),
        videos: estimate?.videos ?? copy.mediaUnlimited,
        durations,
        defaultDurationId: defaultDuration.id,
    };
}
