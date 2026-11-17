'use client';

import { useRsvpReport } from '@/hooks/useRsvps';
import type { RsvpReportDto } from '@/lib/api/types';

export type RsvpStatsReport = { report: RsvpReportDto | null; isLoading: boolean; isError: boolean };

// The STATISTICS report behind the RSVP page's numbers and attendance (one query, two blocks).
// A query that hasn't run yet (no access) counts as loading, as the old stats panel did.
export function useRsvpStatsReport(eventId: string): RsvpStatsReport {
    const { data, isLoading, isError } = useRsvpReport(eventId, 'STATISTICS');
    return { report: data ?? null, isLoading: isLoading || (!data && !isError), isError };
}
