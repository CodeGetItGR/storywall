import type { ProjectedCoverageDto } from '@/lib/api/types';

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
