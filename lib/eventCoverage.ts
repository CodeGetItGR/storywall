import type { EventScheduleDto, ProjectedCoverageDto } from '@/lib/api/types';
import { getDaysUntil } from '@/lib/datetime';

// Last stretch of the coverage window where the host is nudged to download the gallery.
export const COVERAGE_CLOSING_DAYS = 30;

export type CoveragePhase = 'open' | 'closing' | 'ended';

export interface CoverageStatus {
    phase: CoveragePhase;
    coverageEndsAt: string;
    daysUntilEnd: number;
}

/**
 * Where an activated event sits in its coverage window. The gallery is open
 * from activation, so only the end matters. Null while the window is not
 * pinned yet (DRAFT) — there is nothing to describe.
 */
export function getCoverageStatus(schedule: Pick<EventScheduleDto, 'coverageEndsAt'>, referenceDate = new Date()): CoverageStatus | null {
    const { coverageEndsAt } = schedule;
    if (!coverageEndsAt) return null;

    const daysUntilEnd = getDaysUntil(coverageEndsAt, referenceDate);
    if (daysUntilEnd === null) return null;

    const ended = new Date(coverageEndsAt).getTime() <= referenceDate.getTime();
    const phase: CoveragePhase = ended ? 'ended' : daysUntilEnd <= COVERAGE_CLOSING_DAYS ? 'closing' : 'open';

    return { phase, coverageEndsAt, daysUntilEnd };
}

/**
 * The window an event would get if it were activated right now: the start
 * plus the picked duration's months, never before now. The server's
 * `projectedCoverage` is the source of truth and must be preferred wherever an
 * event exists; this is only for the create wizard, where there is no event
 * yet to read a projection off. Null until both a start and a duration are set.
 */
export function projectCoverage({
    startAt,
    hostingMonths,
    referenceDate = new Date(),
}: {
    startAt: string | Date | null | undefined;
    hostingMonths: number | null | undefined;
    referenceDate?: Date;
}): ProjectedCoverageDto | null {
    if (!startAt || !hostingMonths) return null;
    const start = new Date(startAt);
    if (Number.isNaN(start.getTime())) return null;

    const ends = new Date(start);
    ends.setUTCMonth(ends.getUTCMonth() + hostingMonths);

    return {
        coverageEndsAt: new Date(Math.max(ends.getTime(), referenceDate.getTime())).toISOString(),
        hostingMonths,
    };
}
