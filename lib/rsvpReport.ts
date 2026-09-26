import type { RsvpReportCategoryDto, RsvpReportGroupDto, RsvpReportType } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';
import { routes } from '@/lib/routes';

export const RSVP_REPORT_TYPES: RsvpReportType[] = ['STATISTICS', 'FULL_LIST', 'ATTENDING_ONLY', 'WITH_CHILDREN'];

export function isRsvpReportType(value: string): value is RsvpReportType {
    return (RSVP_REPORT_TYPES as string[]).includes(value);
}

// Lives here, not in hooks/useRsvpSubTab, so both the client hook and the
// server pages' prefetch gate can share one pure resolver without lib/
// importing from hooks/.
export type RsvpSubTab = 'stats' | 'list' | 'reports';

const RSVP_SUB_TABS: RsvpSubTab[] = ['stats', 'list', 'reports'];

// Mirrors what URLSearchParams.get('section') returns (a single string or
// null) and what Next's searchParams gives a repeated query param (an array,
// taking its first value). Anything else, including a section neither page
// knows, falls back to the default sub-tab.
export function resolveRsvpSubTab(section: string | string[] | null | undefined): RsvpSubTab {
    const value = Array.isArray(section) ? section[0] : section;
    return typeof value === 'string' && (RSVP_SUB_TABS as string[]).includes(value) ? (value as RsvpSubTab) : 'stats';
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

// Which screen RsvpTab (and its Reports list) is rendered from, so a report
// link can carry it back for Close (see resolveRsvpReportCloseHref).
export type RsvpReportOrigin = 'manage' | 'tools';

// Where a report page's Close (useRsvpReportPage) sends the host, based on the
// `from` search param the report link carried (see routes.events.rsvpReport).
// An allowlist: anything but the known origins falls back to Manage.
export function resolveRsvpReportCloseHref(eventId: string, from: string | null): string {
    if (from === 'tools') return routes.events.tools.rsvp(eventId, { section: 'reports' });
    return routes.events.manage(eventId, { tab: 'rsvp', section: 'reports' });
}
