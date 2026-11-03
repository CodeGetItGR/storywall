import { isoParts } from '@/lib/invitation/dateDisplay';

// Add-to-calendar links for an invitation's date (old live-preview-runtime).
// The time is floating, as written, with no time zone, and the event lasts
// two hours.

const DURATION_HOURS = 2;

type Parts = NonNullable<ReturnType<typeof isoParts>>;

const pad = (value: number) => String(value).padStart(2, '0');

// The parts `hours` later, rolling over into the next day when needed.
function later(parts: Parts, hours: number): Parts {
    const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour + hours, parts.minute));
    return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        hour: date.getUTCHours(),
        minute: date.getUTCMinutes(),
    };
}

const dayOf = (parts: Parts) => `${parts.year}${pad(parts.month)}${pad(parts.day)}`;
const stamp = (parts: Parts) => `${dayOf(parts)}T${pad(parts.hour)}${pad(parts.minute)}00`;
const isoStamp = (parts: Parts) =>
    `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:00`;

export type CalendarLinks = { google: string; outlook: string; yahoo: string };

export function calendarLinks(iso: string, title: string): CalendarLinks | undefined {
    const parts = isoParts(iso);
    if (!parts) return undefined;
    const end = later(parts, DURATION_HOURS);
    const text = encodeURIComponent(title);
    return {
        google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${stamp(parts)}/${stamp(end)}`,
        outlook: `https://outlook.live.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject=${text}&startdt=${encodeURIComponent(isoStamp(parts))}&enddt=${encodeURIComponent(isoStamp(end))}`,
        yahoo: `https://calendar.yahoo.com/?v=60&view=d&type=20&title=${text}&st=${stamp(parts)}&dur=0200`,
    };
}

// The .ics file Apple Calendar opens.
export function calendarIcs(iso: string, title: string): string | undefined {
    const parts = isoParts(iso);
    if (!parts) return undefined;
    const summary = title.replace(/[\\;,]/g, (char) => `\\${char}`).replace(/\r?\n/g, '\\n');
    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'BEGIN:VEVENT',
        `DTSTART:${stamp(parts)}`,
        `DTEND:${stamp(later(parts, DURATION_HOURS))}`,
        `SUMMARY:${summary}`,
        'END:VEVENT',
        'END:VCALENDAR',
    ].join('\r\n');
}
