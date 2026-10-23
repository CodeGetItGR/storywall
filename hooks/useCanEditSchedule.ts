'use client';

import { useHasVendorCapability } from '@/hooks/useVendors';

// Hosts, and planners while their access is open (vendors spec 2026-10-19), edit the schedule.
// A host never asks about vendors.
export function useCanEditSchedule(eventId: string, isHost: boolean): boolean {
    const planner = useHasVendorCapability(isHost ? null : eventId, 'SCHEDULE_EDIT');
    return isHost || planner.allowed;
}
