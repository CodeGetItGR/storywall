import type { PlanRequirementsDto } from '@/lib/api/types';

// What the backend sends as a plan's requirements: a plan without posts takes no guests and needs no date or place.
export function planRequirementsOf(moduleKeys: readonly string[]): PlanRequirementsDto {
    const takesGuests = moduleKeys.includes('posts');
    return { takesGuests, needsSchedule: takesGuests, needsVenue: takesGuests };
}
