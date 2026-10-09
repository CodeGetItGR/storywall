import type { AppMediaConfigDto, CoverageOptionResponseDto, LocalizedText, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { promotedOptionAmountMinor } from '@/lib/billing';
import { formatBytes, numberFormat } from '@/lib/format';
import { activeRoles, type MemberRoleCatalog } from '@/lib/memberRoles';
import { mediaEstimate } from '@/lib/planComparison';
import { configCount, type ConfigObject } from '@/lib/planModuleConfig';
import { enabledModuleKeys } from '@/lib/planModules';
import { liveInitialOptions, shortestInitialOption } from '@/lib/planTiers';

// The search param that picks the event type the landing pricing shows, as an event type slug
// (see lib/eventTypeSlug.ts), so a link can open on it.
export const LANDING_EVENT_PARAM = 'event';

// The current URL with LANDING_EVENT_PARAM set to slug, keeping the other params and the hash.
export function landingEventHref(href: string, slug: string): string {
    const url = new URL(href);
    url.searchParams.set(LANDING_EVENT_PARAM, slug);
    return `${url.pathname}${url.search}${url.hash}`;
}

// One length a plan is sold at, with its price already formatted for the card.
// listPrice is the price before the plan's promotion, set only while one
// lowers this duration, for the card to show struck through beside it.
export type LandingPlanDuration = {
    id: string;
    months: number;
    price: string;
    listPrice: string | null;
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
    coHosts: (max: number | null) => string;
    everythingIn: (planName: string) => string;
    guestsUnlimited: string;
    guestsUpTo: (count: number) => string;
    mediaUnlimited: string;
    // examples: the first few role names, for the line to show what a role is.
    memberRoles: (count: number, custom: boolean, examples: LocalizedText[]) => string;
    memberRolesCustomOnly: string;
    // A module line with a plan detail after it ("Gallery · QR upload"). The
    // label stays standalone so a renamed module never sits inside a sentence.
    moduleWithDetail: (label: string, detail: string) => string;
    qrUpload: string;
    // Detail only, joined to the module label by moduleWithDetail.
    scheduleSessions: (max: number | null) => string;
    storageUnlimited: string;
}

// One duration's price after the plan's promotion (its promo price, else the
// plan's percent).
export function formatLandingOptionPrice(plan: PlanTierResponseDto, option: CoverageOptionResponseDto): string | null {
    if (!plan.priceCurrency) return null;
    return formatLandingAmount(promotedOptionAmountMinor(option, plan), plan.priceCurrency);
}

// The duration's price before the promotion, or null when no promotion lowers it.
export function formatLandingListPrice(plan: PlanTierResponseDto, option: CoverageOptionResponseDto): string | null {
    if (!plan.priceCurrency || promotedOptionAmountMinor(option, plan) >= option.priceAmountMinor) return null;
    return formatLandingAmount(option.priceAmountMinor, plan.priceCurrency);
}

// Mirrors the landing page's existing static style exactly: a whole euro
// amount with a suffixed symbol and no decimals ("79€"), not
// Intl.NumberFormat's default currency rendering (which would print "€79.00"
// or add locale-specific spacing/decimals and change the visual design).
function formatLandingAmount(amountMinor: number, currency: string): string {
    const amount = amountMinor / 100;
    if (currency === 'EUR' && Number.isInteger(amount)) return `${amount}€`;

    return numberFormat(undefined, { style: 'currency', currency }).format(amount);
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
        return price === null ? [] : [{ id: option.id, months: option.months, price, listPrice: formatLandingListPrice(plan, option) }];
    });
}

// Whether a plan gets a card at all: true exactly when buildLandingPlan doesn't return null (some
// active initial option, priced in a currency). resolveLandingCategoryPlans filters through it, so
// the landing and the admin panel's warnings agree on what a tab shows.
export function isLandingPlanOnSale(plan: PlanTierResponseDto): boolean {
    return landingDurations(plan).length > 0 && shortestInitialOption(plan) !== null;
}

function sortedModuleKeys(moduleKeys: string[], modules: PlatformModuleResponseDto[]): string[] {
    const sortOrderByKey = new Map(modules.map((module_) => [module_.moduleKey, module_.sortOrder]));
    return enabledModuleKeys(moduleKeys, modules)
        .slice()
        .sort((left, right) => (sortOrderByKey.get(left) ?? 0) - (sortOrderByKey.get(right) ?? 0));
}

// How many role names the member roles line shows.
const MEMBER_ROLE_EXAMPLES = 2;

// One module's line on a plan card, from that plan's own config for it. Null
// hides the module: a count cap of 0 means the plan allows none. Plans without
// moduleConfigs (null) fall back to the plain module name.
function moduleFeatureLabel(
    moduleKey: string,
    plan: PlanTierResponseDto,
    moduleName: (moduleKey: string) => string,
    copy: LandingPlanCopy,
    memberRoles: MemberRoleCatalog,
): string | null {
    if (!plan.moduleConfigs) return moduleName(moduleKey);

    const config: ConfigObject | undefined = plan.moduleConfigs[moduleKey];
    switch (moduleKey) {
        case 'schedule': {
            const max = configCount(config, 'maxSections');
            return max === 0 ? null : copy.moduleWithDetail(moduleName(moduleKey), copy.scheduleSessions(max));
        }
        case 'co_hosts': {
            const max = configCount(config, 'maxCoHosts');
            return max === 0 ? null : copy.coHosts(max);
        }
        case 'gallery':
            return config?.qrUploadEnabled === true ? copy.moduleWithDetail(moduleName(moduleKey), copy.qrUpload) : moduleName(moduleKey);
        case 'member_roles': {
            // Plans don't cap roles: the count is the event type's catalog, and
            // the plan only decides whether members may type their own.
            const roles = activeRoles(memberRoles, plan.eventTypeKey);
            const custom = config?.allowCustom === true;
            if (roles.length === 0) return custom ? copy.memberRolesCustomOnly : null;
            const examples = roles.slice(0, MEMBER_ROLE_EXAMPLES).map((role) => role.label);
            return copy.memberRoles(roles.length, custom, examples);
        }
        default:
            return moduleName(moduleKey);
    }
}

// Builds one landing pricing card from a plan tier plus the tier directly
// below it (on the landing: the previous card of the same event type — see
// useLandingPricingPlans). Each tier after the first rolls up the
// previous card and lists only its additional modules and raised limits, so
// catalog rows do not need to repeat every inherited module. Returns null for a plan with no
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
    memberRoles: MemberRoleCatalog = {},
): LandingPlan | null {
    const durations = landingDurations(plan);
    const defaultDuration = shortestInitialOption(plan);
    // Keep in step with isLandingPlanOnSale.
    if (durations.length === 0 || !defaultDuration) return null;

    const estimate = mediaEstimate(plan.storageBytes, media);
    const inheritedKeys = [...new Set(inheritedModuleKeys ?? previousPlan?.moduleKeys ?? [])];
    const labelFor = (moduleKey: string, tier: PlanTierResponseDto) => moduleFeatureLabel(moduleKey, tier, moduleName, copy, memberRoles);

    // A later tier lists the modules it adds, plus inherited ones whose limit
    // or setting changed; unchanged inherited modules go in the rollup.
    const features: string[] = [];
    const includedFeatures: string[] = [];
    for (const moduleKey of sortedModuleKeys([...new Set([...inheritedKeys, ...plan.moduleKeys])], modules)) {
        const label = labelFor(moduleKey, plan);
        if (label === null) continue;
        if (previousPlan && inheritedKeys.includes(moduleKey) && labelFor(moduleKey, previousPlan) === label) includedFeatures.push(label);
        else features.push(label);
    }
    if (previousPlan) features.unshift(copy.everythingIn(previousPlan.name));

    return {
        code: plan.code,
        audience: plan.maxMembers === null ? copy.guestsUnlimited : copy.guestsUpTo(plan.maxMembers),
        features,
        includedFeatures: includedFeatures.length > 0 ? includedFeatures : undefined,
        name: plan.name,
        photos: estimate?.images ?? copy.mediaUnlimited,
        storage: plan.storageBytes === null ? copy.storageUnlimited : formatBytes(plan.storageBytes),
        videos: estimate?.videos ?? copy.mediaUnlimited,
        durations,
        defaultDurationId: defaultDuration.id,
    };
}
