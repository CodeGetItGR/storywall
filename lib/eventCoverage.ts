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
 * The window an event would get if it were activated right now: the picked
 * duration's months from today, since coverage runs from payment. The server's
 * `projectedCoverage` is the source of truth and must be preferred wherever an
 * event exists; this is only for the create wizard, where there is no event
 * yet to read a projection off. Null until a duration is picked.
 */
export function projectCoverage({
    hostingMonths,
    referenceDate = new Date(),
}: {
    hostingMonths: number | null | undefined;
    referenceDate?: Date;
}): ProjectedCoverageDto | null {
    if (!hostingMonths) return null;

    const ends = new Date(referenceDate);
    ends.setUTCMonth(ends.getUTCMonth() + hostingMonths);

    return { coverageEndsAt: ends.toISOString(), hostingMonths };
}

/**
 * The latest start that leaves `minDaysAfterStart` of coverage after the event
 * (3032 past it). Pass the pinned `coverageEndsAt` of a live event, or the
 * projected one of a draft. Null while either is unknown.
 */
export function getLatestStartAt(coverageEndsAt: string | null | undefined, minDaysAfterStart: number | undefined): string | null {
    if (!coverageEndsAt || minDaysAfterStart === undefined) return null;
    const ends = new Date(coverageEndsAt);
    if (Number.isNaN(ends.getTime())) return null;

    ends.setUTCDate(ends.getUTCDate() - minDaysAfterStart);
    return ends.toISOString();
}

/**
 * Whether paying now for `months` of coverage leaves `minDaysAfterStart` of it
 * after `startAt` (3032 otherwise). True while the start or the setting is unknown,
 * so nothing is blocked before the server can answer.
 */
export function coverageFitsStart({
    startAt,
    months,
    minDaysAfterStart,
    referenceDate = new Date(),
}: {
    startAt: string | null;
    months: number;
    minDaysAfterStart: number | undefined;
    referenceDate?: Date;
}): boolean {
    const latestStartAt = getLatestStartAt(projectCoverage({ hostingMonths: months, referenceDate })?.coverageEndsAt, minDaysAfterStart);
    if (!startAt || !latestStartAt) return true;
    return Date.parse(startAt) <= Date.parse(latestStartAt);
}
