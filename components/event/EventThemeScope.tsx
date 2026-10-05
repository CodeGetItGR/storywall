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
        // Fills the shell's content area: its wrapper is a grid, so min-h-full is not needed here. On mobile
        // the shell's main reserves pb-20 for the tab bar in its own white; pulling the scope over that
        // strip (-mb-20 pb-20) lets the theme colour reach the bottom of the viewport.
        <div className="-mb-20 bg-event pb-20 lg:mb-0 lg:pb-0" style={eventThemeStyle(theme?.backgroundColor)}>
            {children}
        </div>
    );
}
