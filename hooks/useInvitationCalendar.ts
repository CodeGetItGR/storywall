'use client';

import { useCallback, useMemo } from 'react';

import { calendarIcs, calendarLinks } from '@/lib/invitation/calendarLinks';

// The invitation's add-to-calendar links, and the .ics file for Apple Calendar.
export function useInvitationCalendar(iso: string, title: string) {
    const links = useMemo(() => calendarLinks(iso, title), [iso, title]);

    const downloadIcs = useCallback(() => {
        const ics = calendarIcs(iso, title);
        if (!ics) return;
        const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'event.ics';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, [iso, title]);

    return { links, downloadIcs };
}
