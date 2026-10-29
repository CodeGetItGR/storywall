import type { AppConfigResponseDto, EventTypeConvention } from '@/lib/api/types';
import { EVENT_MODULE_KEYS } from '@/lib/api/types';
import { publicAssignablePlans } from '@/lib/planTiers';
import { bySortOrder } from '@/lib/sortOrder';

// Part of every event, whatever the plan.
export const OCCASION_CORE_FEATURES = ['invitation'] as const;

// Modules the features overview leaves out: internal ones, plan details, vendors (hired help, not a guest feature),
// qr_cards (a host print tool), and `theme`, which has its own row.
export const OCCASION_HIDDEN_MODULES: ReadonlySet<string> = new Set(['member_roles', 'co_hosts', 'theme', 'vendors', 'qr_cards']);

// The landing's feature icons, by feature key.
const FEATURE_ICONS: Record<string, string> = {
    invitation: '/landing/decor-10.webp',
    posts: '/landing/decor-05.webp',
    rsvp: '/landing/decor-13.webp',
    playlist: '/landing/decor-12.webp',
    stories: '/landing/decor-06.webp',
    gallery: '/landing/decor-14.webp',
    wishlist: '/landing/decor-17.webp',
    wishbook: '/landing/decor-15.webp',
    schedule: '/landing/decor-11.webp',
};

export function occasionFeatureIcon(key: string): string {
    return FEATURE_ICONS[key] ?? '/landing/decor-05.webp';
}

// Every key a features overview can show; each has generic copy under OccasionPages.common.features.
export const OCCASION_FEATURE_KEYS: readonly string[] = [
    ...OCCASION_CORE_FEATURES,
    ...EVENT_MODULE_KEYS.filter((key) => !OCCASION_HIDDEN_MODULES.has(key)),
];

// Every module a host can get for this event type: included in, or sold as an add-on to, a public plan.
export function occasionModuleKeys(config: AppConfigResponseDto, eventType: EventTypeConvention): Set<string> {
    const keys = new Set<string>();
    for (const plan of publicAssignablePlans(config.planTiers, 'EVENT')) {
        if (plan.eventTypeKey !== eventType) continue;
        for (const key of plan.moduleKeys) keys.add(key);
        for (const service of plan.paidModules ?? []) if (service.grantsModuleKey) keys.add(service.grantsModuleKey);
    }
    const enabled = new Set(config.modules.filter((module) => module.isEnabled).map((module) => module.moduleKey));
    return new Set([...keys].filter((key) => enabled.has(key)));
}

// The features overview, in the platform's module order. Config unknown → the occasion's own copy keys.
export function occasionFeatureKeys(config: AppConfigResponseDto | null, eventType: EventTypeConvention, fallback: readonly string[]): string[] {
    if (!config) return [...fallback];
    const available = occasionModuleKeys(config, eventType);
    const modules = [...config.modules]
        .sort(bySortOrder)
        .map((module) => module.moduleKey)
        .filter((key) => available.has(key) && !OCCASION_HIDDEN_MODULES.has(key));
    return [...OCCASION_CORE_FEATURES, ...modules];
}

// Themes are shown only when a public plan for this event type includes them.
export function occasionOffersThemes(config: AppConfigResponseDto | null, eventType: EventTypeConvention): boolean {
    return config ? occasionModuleKeys(config, eventType).has('theme') : false;
}
