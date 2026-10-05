'use client';

import type { ReactNode } from 'react';

import { eventThemeStyle } from '@/lib/eventTheme';
import { useActiveEvent, useRouteEventId } from '@/providers/EventProvider';

// The event app's root surface. Puts the event's theme colour in --event-bg for
// every `bg-event` surface below it; without a theme they keep today's background.
export function EventThemeScope({ children }: { children: ReactNode }) {
    const activeEvent = useActiveEvent();
    // Id-less routes (/post/[id]) fall back to the last visited event, which the page is not about.
    const routeEventId = useRouteEventId();
    const theme = routeEventId && activeEvent?.id === routeEventId ? activeEvent.theme : null;

    return (
        <div className="min-h-full bg-event" style={eventThemeStyle(theme?.backgroundColor)}>
            {children}
        </div>
    );
}
