'use client';

import { useMemo, useState } from 'react';

import { calendarEntries, type CalendarEntry, type CalendarEvent, googleCalendarUrl, outlookCalendarUrl } from '@/lib/eventCalendar';
import { routes } from '@/lib/routes';

export interface CalendarLinks {
    google: string;
    apple: string;
    outlook: string;
    microsoft365: string;
}

function buildLinks(eventId: string, entry: CalendarEntry): CalendarLinks {
    const eventUrl = new URL(routes.events.feed(eventId), window.location.origin).toString();

    return {
        google: googleCalendarUrl(entry, eventUrl),
        apple: routes.events.calendar(eventId, entry.sessionId),
        outlook: outlookCalendarUrl(entry, eventUrl, 'outlook'),
        microsoft365: outlookCalendarUrl(entry, eventUrl, 'microsoft365'),
    };
}

// The feed date's "add to calendar" sheet: which entries there are, which one
// is picked, and the calendar links for it.
export function useAddToCalendar(eventId: string, event: CalendarEvent) {
    const entries = useMemo(() => calendarEntries(event), [event]);
    const [open, setOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selected = entries[selectedIndex] ?? entries[0] ?? null;
    // Built only while open: the links need the page's origin.
    const links = useMemo(() => (open && selected ? buildLinks(eventId, selected) : null), [eventId, open, selected]);

    return {
        available: entries.length > 0,
        entries,
        selectedIndex,
        selectEntry: setSelectedIndex,
        links,
        open,
        openSheet: () => setOpen(true),
        closeSheet: () => setOpen(false),
    };
}
