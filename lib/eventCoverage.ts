import type { AppCoverageConfigDto, EventScheduleDto, ProjectedCoverageDto } from '@/lib/api/types';
import { getDaysUntil } from '@/lib/datetime';

// Last stretch of the coverage window where the host is nudged to download the gallery.
export const COVERAGE_CLOSING_DAYS = 30;

export type CoveragePhase = 'beforeOpen' | 'open' | 'closing' | 'ended';

export interface CoverageStatus {
    phase: CoveragePhase;
    galleryOpensAt: string;
    coverageEndsAt: string;
    daysUntilOpen: number;
    daysUntilEnd: number;
}

/**
 * Where an activated event sits in its coverage window. Null while the window
 * is not pinned yet (DRAFT) — there is nothing to describe.
 */
export function getCoverageStatus(
    schedule: Pick<EventScheduleDto, 'galleryOpensAt' | 'coverageEndsAt'>,
    referenceDate = new Date()
): CoverageStatus | null {
    const { galleryOpensAt, coverageEndsAt } = schedule;
    if (!galleryOpensAt || !coverageEndsAt) return null;

    const daysUntilOpen = getDaysUntil(galleryOpensAt, referenceDate);
    const daysUntilEnd = getDaysUntil(coverageEndsAt, referenceDate);
    if (daysUntilOpen === null || daysUntilEnd === null) return null;

    const ended = new Date(coverageEndsAt).getTime() <= referenceDate.getTime();
    const phase: CoveragePhase = ended ? 'ended' : daysUntilOpen > 0 ? 'beforeOpen' : daysUntilEnd <= COVERAGE_CLOSING_DAYS ? 'closing' : 'open';

    return { phase, galleryOpensAt, coverageEndsAt, daysUntilOpen, daysUntilEnd };
}

/**
 * The window an event would get if it were activated right now, computed from
 * the /api/config constants. The server's `projectedCoverage` is the source of
 * truth and must be preferred wherever an event exists; this is only for the
 * create wizard, where there is no event yet to read a projection off.
 */
export function projectCoverage({
    startAt,
    hostingMonths,
    coverage,
    referenceDate = new Date(),
}: {
    startAt: string | Date | null | undefined;
    // The plan's autoDeleteMonths; null/undefined falls back to the platform default.
    hostingMonths?: number | null;
    coverage: Pick<AppCoverageConfigDto, 'maxPreEventDays' | 'defaultHostingMonths'> | null | undefined;
    referenceDate?: Date;
}): ProjectedCoverageDto | null {
    if (!startAt || !coverage) return null;
    const start = new Date(startAt);
    if (Number.isNaN(start.getTime())) return null;

    const months = hostingMonths ?? coverage.defaultHostingMonths;
    const now = referenceDate.getTime();

    const opens = new Date(start);
    opens.setUTCDate(opens.getUTCDate() - coverage.maxPreEventDays);
    const ends = new Date(start);
    ends.setUTCMonth(ends.getUTCMonth() + months);

    return {
        galleryOpensAt: new Date(Math.max(opens.getTime(), now)).toISOString(),
        coverageEndsAt: new Date(Math.max(ends.getTime(), now)).toISOString(),
        hostingMonths: months,
    };
}

/** Whole days between the gallery opening and the event itself; 0 when it opens immediately. */
export function getGalleryLeadDays(galleryOpensAt: string, startAt: string): number {
    return getDaysUntil(startAt, new Date(galleryOpensAt)) ?? 0;
}
