import type { AppMediaConfigDto, EventTypeConvention, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { discountedAmountMinor } from '@/lib/billing';
import { formatBytes } from '@/lib/format';
import { mediaEstimate } from '@/lib/planComparison';
import { enabledModuleKeys } from '@/lib/planModules';
import { publicAssignablePlans } from '@/lib/planTiers';

export type LandingPricingCategoryKey = 'wedding' | 'vip';

// The two landing tabs don't correspond 1:1 to a BE eventTypeKey. Each entry
// is an ordered list of candidate types for that tab — resolveLandingCategoryPlans
// uses the first one that actually has plans, it never merges plans from two
// types into one tab. See docs/superpowers/plans/2026-09-18-landing-pricing-dynamic-plans.md.
export const LANDING_PRICING_CATEGORY_EVENT_TYPES: Record<LandingPricingCategoryKey, EventTypeConvention[]> = {
    wedding: ['WEDDING', 'BAPTISM'],
    vip: ['SOCIAL_EVENT'],
};

export type LandingPlan = {
    audience: string;
    features: string[];
    name: string;
    photos: string;
    price: string;
    storage: string;
    videos: string;
};

export interface LandingPlanCopy {
    accessMonths: (months: number) => string;
    accessUnlimited: string;
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

// Mirrors the landing page's existing static style exactly: a whole euro
// amount with a suffixed symbol and no decimals ("79€"), not
// Intl.NumberFormat's default currency rendering (which would print "€79.00"
// or add locale-specific spacing/decimals and change the visual design).
export function formatLandingPlanPrice(plan: PlanTierResponseDto): string | null {
    if (plan.priceAmountMinor === null || !plan.priceCurrency) return null;

    const amount = discountedAmountMinor(plan.priceAmountMinor, plan) / 100;
    if (plan.priceCurrency === 'EUR' && Number.isInteger(amount)) return `${amount}€`;

    return new Intl.NumberFormat(undefined, { style: 'currency', currency: plan.priceCurrency }).format(amount);
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
// resolvable price — a pricing card with no price to show doesn't belong on
// the pricing page.
export function buildLandingPlan(
    plan: PlanTierResponseDto,
    previousPlan: PlanTierResponseDto | undefined,
    modules: PlatformModuleResponseDto[],
    media: AppMediaConfigDto,
    moduleName: (moduleKey: string) => string,
    copy: LandingPlanCopy,
    priceFallback?: string
): LandingPlan | null {
    const price = formatLandingPlanPrice(plan) ?? priceFallback ?? null;
    if (price === null) return null;

    const estimate = mediaEstimate(plan.storageBytes, media);
    const accessBullet = plan.autoDeleteMonths === null ? copy.accessUnlimited : copy.accessMonths(plan.autoDeleteMonths);
    const features = previousPlan
        ? [
              copy.everythingIn(previousPlan.name),
              ...sortedModuleNames(
                  plan.moduleKeys.filter((moduleKey) => !previousPlan.moduleKeys.includes(moduleKey)),
                  modules,
                  moduleName
              ),
              accessBullet,
          ]
        : [...copy.baselineFeatures, ...sortedModuleNames(plan.moduleKeys, modules, moduleName), accessBullet];

    return {
        audience: plan.maxMembers === null ? copy.guestsUnlimited : copy.guestsUpTo(plan.maxMembers),
        features,
        name: plan.name,
        photos: estimate?.images ?? copy.mediaUnlimited,
        price,
        storage: plan.storageBytes === null ? copy.storageUnlimited : formatBytes(plan.storageBytes),
        videos: estimate?.videos ?? copy.mediaUnlimited,
    };
}
