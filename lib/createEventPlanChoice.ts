import type { EventTypeConvention, PlanTierResponseDto } from '@/lib/api/types';
import { CREATE_EVENT_FEATURE_KEYS, type CreateEventFeatureKey, featurePriority, isCreateEventFeatureKey } from '@/lib/createEventFeatures';
import { bySortOrder } from '@/lib/sortOrder';

const HIGHLIGHT_COUNT = 3;

export type GuestChip = { planCode: string; kind: 'upTo' | 'moreThan'; count: number };

// One chip per full plan, in sortOrder (spec 5.3): "Up to {maxMembers}", the largest "More than
// {previous maxMembers}". A plan with no guest limit gets none; one plan alone needs no chips.
export function guestChips(fullPlans: PlanTierResponseDto[]): GuestChip[] {
    const sorted = [...fullPlans].sort(bySortOrder);
    if (sorted.length < 2) return [];

    return sorted.flatMap((plan, index): GuestChip[] => {
        if (index === sorted.length - 1) {
            const previousMax = sorted[index - 1].maxMembers;
            return previousMax === null ? [] : [{ planCode: plan.code, kind: 'moreThan', count: previousMax }];
        }
        return plan.maxMembers === null ? [] : [{ planCode: plan.code, kind: 'upTo', count: plan.maxMembers }];
    });
}

// A plan's feature modules in the type's order, then any others the wizard has icons for.
function orderedFeatures(moduleKeys: string[], eventType: EventTypeConvention): CreateEventFeatureKey[] {
    const priority = featurePriority(eventType);
    const order = [...priority, ...CREATE_EVENT_FEATURE_KEYS.filter((key) => !priority.includes(key))];
    return order.filter((key) => moduleKeys.includes(key) && isCreateEventFeatureKey(key));
}

function addedFeatures(
    plan: PlanTierResponseDto,
    previous: PlanTierResponseDto | undefined,
    eventType: EventTypeConvention,
): CreateEventFeatureKey[] {
    const own = orderedFeatures(plan.moduleKeys, eventType);
    return previous ? own.filter((key) => !previous.moduleKeys.includes(key)) : own;
}

// The plan card's tiles: up to three modules this plan adds over the previous one, or the first
// plan's own top three.
export function planHighlights(
    plan: PlanTierResponseDto,
    previous: PlanTierResponseDto | undefined,
    eventType: EventTypeConvention,
): CreateEventFeatureKey[] {
    return addedFeatures(plan, previous, eventType).slice(0, HIGHLIGHT_COUNT);
}

export type CompareLine =
    | { kind: 'own'; keys: CreateEventFeatureKey[]; more: boolean }
    | { kind: 'plus'; previousName: string; keys: CreateEventFeatureKey[] }
    | { kind: 'same'; previousName: string };

// A compare-sheet row's feature line (copy rows 37-39).
export function compareLine(plan: PlanTierResponseDto, previous: PlanTierResponseDto | undefined, eventType: EventTypeConvention): CompareLine {
    const added = addedFeatures(plan, previous, eventType);
    if (!previous) return { kind: 'own', keys: added.slice(0, HIGHLIGHT_COUNT), more: added.length > HIGHLIGHT_COUNT };
    if (added.length === 0) return { kind: 'same', previousName: previous.name };
    return { kind: 'plus', previousName: previous.name, keys: added.slice(0, HIGHLIGHT_COUNT) };
}
