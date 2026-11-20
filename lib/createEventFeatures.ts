import type { AppConfigResponseDto, EventTypeConvention } from '@/lib/api/types';
import { occasionModuleKeys } from '@/lib/occasions/occasionFeatures';
import { publicAssignablePlans } from '@/lib/planTiers';

// The modules the wizard's type step and plan card can show, each with an icon.
export const CREATE_EVENT_FEATURE_KEYS = [
    'gallery',
    'qr_cards',
    'wishbook',
    'rsvp',
    'stories',
    'playlist',
    'schedule',
    'co_hosts',
    'theme',
    'he_or_she',
    'posts',
] as const;
export type CreateEventFeatureKey = (typeof CREATE_EVENT_FEATURE_KEYS)[number];

const BIG_COUNT = 4;
const SMALL_MAX = 4;

// Approved per type (spec 5.2): the first four are the big ones, the rest fill the small row.
const PRIORITY: Partial<Record<EventTypeConvention, CreateEventFeatureKey[]>> = {
    WEDDING: ['gallery', 'qr_cards', 'wishbook', 'rsvp', 'stories', 'playlist', 'schedule', 'co_hosts'],
    BAPTISM: ['gallery', 'wishbook', 'rsvp', 'stories', 'playlist', 'schedule', 'theme', 'co_hosts'],
    GENDER_REVEAL: ['he_or_she', 'gallery', 'wishbook', 'rsvp', 'stories', 'playlist', 'schedule', 'theme'],
    REUNION: ['gallery', 'rsvp', 'stories', 'co_hosts', 'playlist', 'schedule', 'posts'],
};
const DEFAULT_PRIORITY: CreateEventFeatureKey[] = ['gallery', 'rsvp', 'wishbook', 'stories', 'playlist', 'schedule', 'co_hosts', 'theme', 'posts'];

export function featurePriority(eventType: EventTypeConvention): CreateEventFeatureKey[] {
    return PRIORITY[eventType] ?? DEFAULT_PRIORITY;
}

export function isCreateEventFeatureKey(key: string): key is CreateEventFeatureKey {
    return (CREATE_EVENT_FEATURE_KEYS as readonly string[]).includes(key);
}

export type CreateEventFeatures = { big: CreateEventFeatureKey[]; small: CreateEventFeatureKey[]; showPlanNote: boolean };

// What the type step shows: the type's list, keeping only what some public plan of that type
// includes or sells as an add-on, so a missing feature lets the next one move up.
export function createEventFeatures(config: AppConfigResponseDto | null | undefined, eventType: EventTypeConvention): CreateEventFeatures {
    if (!config) return { big: [], small: [], showPlanNote: false };

    const offered = occasionModuleKeys(config, eventType);
    const shown = featurePriority(eventType).filter((key) => offered.has(key));
    const big = shown.slice(0, BIG_COUNT);
    const small = shown.slice(BIG_COUNT, BIG_COUNT + SMALL_MAX);

    // The note: some feature on show isn't included in every public plan of this type.
    const plans = publicAssignablePlans(config.planTiers, 'EVENT').filter((plan) => plan.eventTypeKey === eventType);
    const showPlanNote = [...big, ...small].some((key) => plans.some((plan) => !plan.moduleKeys.includes(key)));

    return { big, small, showPlanNote };
}

// Where a big feature's one-line description comes from: new approved lines (copy rows 9–13, 15) live
// under CreateEventPage.wizard.features.lines; the rest reuse the module's own description.
const WIZARD_LINES: ReadonlySet<CreateEventFeatureKey> = new Set(['posts', 'qr_cards', 'playlist', 'schedule', 'stories', 'wishbook']);

export function featureLineSource(key: CreateEventFeatureKey): 'wizard' | 'module' {
    return WIZARD_LINES.has(key) ? 'wizard' : 'module';
}
