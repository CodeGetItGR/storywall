'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { ThemeFontFace } from '@/components/event/ThemeFontFace';
import { eventThemeStyle, isThemedEventPage, themeFontScopeProps } from '@/lib/eventTheme';
import { useActiveEvent, useRouteEventId } from '@/providers/EventProvider';

// The event app's root surface. On the guest-facing pages it puts the event's theme colour
// in --event-bg for every `bg-event` surface below it, the post-card and title colours, and
// the heading font (declared here, applied to `.event-heading`); elsewhere, or without a
// theme, they keep today's look.
export function EventThemeScope({ children }: { children: ReactNode }) {
    const activeEvent = useActiveEvent();
    // Id-less routes (/post/[id]) fall back to the last visited event, which the page is not about.
    const routeEventId = useRouteEventId();
    const pathname = usePathname();
    const theme = routeEventId && activeEvent?.id === routeEventId && isThemedEventPage(pathname) ? activeEvent.theme : null;
    const themeStyle = eventThemeStyle(theme?.backgroundColor, { titleColor: theme?.titleColor, headingFont: theme?.headingFont });
    // The font rides with the rest of the theme: a theme whose colour is unusable is no theme at all.
    const headingFont = themeStyle ? theme?.headingFont : null;

    return (
        // Fills the shell's content area: its wrapper is a grid, so min-h-full is not needed here. On mobile
        // the shell's main reserves --tab-bar-h for the tab bar in its own white; pulling the scope over that
        // strip (-mb-(--tab-bar-h) pb-(--tab-bar-h)) lets the theme colour reach the bottom of the viewport.
        <div className="-mb-(--tab-bar-h) bg-event pb-(--tab-bar-h) lg:mb-0 lg:pb-0" style={themeStyle} {...themeFontScopeProps(headingFont)}>
            <ThemeFontFace font={headingFont} />
            {children}
        </div>
    );
}
