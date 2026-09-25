import type { RsvpReportCategoryDto, RsvpReportGroupDto, RsvpReportType } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

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
