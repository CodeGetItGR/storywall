import type { AdminLandingCategoryDto, AppEventTypeResponseDto, PlanTierResponseDto } from '@/lib/api/types';
import { type DriftedGroup, resolveLandingCategoryPlans } from '@/lib/landingCategories';
import type { MemberRoleCatalog } from '@/lib/memberRoles';

export type LandingCategoryWarnings = { noEnabledType: boolean; noVisiblePlan: boolean; driftedGroups: DriftedGroup[] };

// What the admin panel warns about. It runs the landing's own builder on the public config
// (planTiers, memberRolesByEventType, and eventTypes, which lists enabled types only), so the
// panel and the landing can't disagree about what a tab shows: noVisiblePlan is exactly a tab the
// landing hides.
export function landingCategoryWarnings(
    category: AdminLandingCategoryDto,
    publicPlans: PlanTierResponseDto[],
    enabledEventTypes: AppEventTypeResponseDto[],
    memberRoles: MemberRoleCatalog,
): LandingCategoryWarnings {
    const enabledKeys = new Set(enabledEventTypes.map((type) => type.eventTypeKey));
    const shownKeys = category.eventTypeKeys.filter((key) => enabledKeys.has(key));
    const { plans, driftedGroups } = resolveLandingCategoryPlans(publicPlans, shownKeys, memberRoles);
    return { noEnabledType: shownKeys.length === 0, noVisiblePlan: plans.length === 0, driftedGroups };
}
