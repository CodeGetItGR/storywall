import type { RsvpReportCategoryDto, RsvpReportGroupDto, RsvpReportType } from '@/lib/api/types';
import { formatDate, getDaysUntil } from '@/lib/datetime';
import { routes } from '@/lib/routes';

export const RSVP_REPORT_TYPES: RsvpReportType[] = ['STATISTICS', 'FULL_LIST', 'ATTENDING_ONLY', 'WITH_CHILDREN'];

export function isRsvpReportType(value: string): value is RsvpReportType {
    return (RSVP_REPORT_TYPES as string[]).includes(value);
}

// eventDate is a plain yyyy-MM-dd in the event's own timezone. It parses as UTC
// midnight, so it's formatted in UTC too, or a reader west of UTC sees the day before.
export function formatReportDate(locale: string, eventDate: string): string {
    return formatDate(locale, eventDate, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

// A stable React key for a category or group: the answers that define it.
export function reportSectionKey(section: RsvpReportCategoryDto | RsvpReportGroupDto): string {
    return `${section.attending}|${section.comingSessionIds.join(',')}|${section.noAnswerSessionIds.join(',')}`;
}

// Which screen a report link comes from, so Close can go back there
// (see resolveRsvpReportCloseHref). The host's RSVP page is the default.
export type RsvpReportOrigin = 'manage' | 'vendor';

// Where a report page's Close (useRsvpReportPage) sends the user, from the
// `from` search param the report link carried (see routes.events.rsvpReport).
// An allowlist: anything but a planner's vendor page goes back to the RSVP page
// (old from=tools links included: Tools > RSVP now redirects there, KAN-227).
export function resolveRsvpReportCloseHref(eventId: string, from: string | null): string {
    if (from === 'vendor') return routes.events.tools.vendorMe(eventId);
    return routes.events.manage(eventId, { tab: 'rsvp' });
}

export type RsvpCountdown = { labelKey: 'deadlineLabel' | 'eventDateLabel'; target: string | null; daysLeft: number };

// The RSVP page's countdown: to the deadline, or to the event when none is set.
// An event with no date yet and no deadline has nothing to count down to: no target, 0 days.
export function rsvpCountdown(rsvpDeadline: string | null, startAt: string | null, now: Date = new Date()): RsvpCountdown {
    const target = rsvpDeadline ?? startAt;
    return { labelKey: rsvpDeadline ? 'deadlineLabel' : 'eventDateLabel', target, daysLeft: getDaysUntil(target, now) ?? 0 };
}
