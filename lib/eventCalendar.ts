import type { EventDetailResponseDto } from '@/lib/api/types';
import { sortSessions } from '@/lib/eventSessions';

// Length given to an entry that has no end time.
export const CALENDAR_DEFAULT_DURATION_HOURS = 6;

export interface CalendarEntry {
    // The session's id, or null for the event itself when it has no timed sessions.
    sessionId: string | null;
    title: string;
    // Only shown in the picker; the calendar gets `title`.
    label: string;
    startAt: Date;
    endAt: Date;
    location: string | null;
}

export type CalendarEvent = Pick<EventDetailResponseDto, 'title' | 'schedule' | 'location' | 'sessions'>;

function toDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function endOrDefault(startAt: Date, endAt: Date | null): Date {
    if (endAt && endAt.getTime() > startAt.getTime()) return endAt;
    return new Date(startAt.getTime() + CALENDAR_DEFAULT_DURATION_HOURS * 60 * 60 * 1000);
}

function eventPlace(event: CalendarEvent): string | null {
    return event.location.name ?? event.location.address ?? null;
}

// One entry per session with a start time. Sessions can be weeks apart, so
// they're never merged into one span. With none, the event's own date.
export function calendarEntries(event: CalendarEvent): CalendarEntry[] {
    const sessions = sortSessions(event.sessions ?? []);
    const entries: CalendarEntry[] = [];

    for (const session of sessions) {
        const startAt = toDate(session.startAt);
        if (!startAt) continue;
        entries.push({
            sessionId: session.id,
            title: `${event.title} · ${session.title}`,
            label: session.title,
            startAt,
            endAt: endOrDefault(startAt, toDate(session.endAt)),
            location: session.locationName ?? (session.isMain ? eventPlace(event) : null),
        });
    }
    if (entries.length > 0) return entries;

    const startAt = toDate(event.schedule.startAt);
    if (!startAt) return [];
    return [
        {
            sessionId: null,
            title: event.title,
            label: event.title,
            startAt,
            endAt: endOrDefault(startAt, toDate(event.schedule.endAt)),
            location: eventPlace(event),
        },
    ];
}

// 20261013T180000Z
function compactUtc(date: Date): string {
    return date
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '');
}

export function googleCalendarUrl(entry: CalendarEntry, details: string): string {
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: entry.title,
        dates: `${compactUtc(entry.startAt)}/${compactUtc(entry.endAt)}`,
        details,
    });
    if (entry.location) params.set('location', entry.location);
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const outlookHosts = {
    outlook: 'https://outlook.live.com',
    microsoft365: 'https://outlook.office.com',
} as const;

export function outlookCalendarUrl(entry: CalendarEntry, details: string, host: keyof typeof outlookHosts): string {
    const params = new URLSearchParams({
        path: '/calendar/action/compose',
        rru: 'addevent',
        subject: entry.title,
        startdt: entry.startAt.toISOString(),
        enddt: entry.endAt.toISOString(),
        body: details,
    });
    if (entry.location) params.set('location', entry.location);
    return `${outlookHosts[host]}/calendar/0/action/compose?${params.toString()}`;
}

function escapeIcsText(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

// RFC 5545 caps a line at 75 octets; longer ones continue on lines starting with a space.
function foldIcsLine(line: string): string {
    const encoder = new TextEncoder();
    const parts: string[] = [];
    let current = '';
    let currentBytes = 0;

    for (const char of line) {
        const charBytes = encoder.encode(char).length;
        const limit = parts.length === 0 ? 75 : 74;
        if (currentBytes + charBytes > limit) {
            parts.push(current);
            current = '';
            currentBytes = 0;
        }
        current += char;
        currentBytes += charBytes;
    }
    parts.push(current);

    return parts.join('\r\n ');
}

export function buildIcs(entry: CalendarEntry, { uid, url, now = new Date() }: { uid: string; url: string; now?: Date }): string {
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Storywall//Event//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${compactUtc(now)}`,
        `DTSTART:${compactUtc(entry.startAt)}`,
        `DTEND:${compactUtc(entry.endAt)}`,
        `SUMMARY:${escapeIcsText(entry.title)}`,
        ...(entry.location ? [`LOCATION:${escapeIcsText(entry.location)}`] : []),
        `DESCRIPTION:${escapeIcsText(url)}`,
        `URL:${url}`,
        'END:VEVENT',
        'END:VCALENDAR',
    ];

    return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}
