'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { ThemeFontFace } from '@/components/event/ThemeFontFace';
import { useFeedPageThemeOverride } from '@/hooks/useFeedPageTheme';
import { eventThemeStyle, isThemedEventPage, themeFontScopeProps } from '@/lib/eventTheme';
import { useActiveEvent, useRouteEventId } from '@/providers/EventProvider';

// The event app's root surface. On the guest-facing pages it puts the event's theme colour
// in --event-bg for every `bg-event` surface below it, the post-card and title colours, and
// the heading font (declared here, applied to `.event-heading`); elsewhere, or without a
// theme, they keep today's look. The feed can replace that theme for its own event (lib/feedPageTheme.ts).
export function EventThemeScope({ children }: { children: ReactNode }) {
    const activeEvent = useActiveEvent();
    // Id-less routes (/post/[id]) fall back to the last visited event, which the page is not about.
    const routeEventId = useRouteEventId();
    const pathname = usePathname();
    const themed = Boolean(routeEventId) && activeEvent?.id === routeEventId && isThemedEventPage(pathname);
    // The feed may draw another theme than the event's: its own background colour, or edit mode's held preset.
    const override = useFeedPageThemeOverride(themed ? routeEventId : null);
    const theme = themed && activeEvent ? (override ? override.theme : activeEvent.theme) : null;
    const themeStyle = eventThemeStyle(theme?.backgroundColor, { titleColor: theme?.titleColor, headingFont: theme?.headingFont });
    // The font rides with the rest of the theme: a theme whose colour is unusable is no theme at all.
    const headingFont = themeStyle ? theme?.headingFont : null;

    return (
        // Fills the shell's content area: its wrapper is a grid, so min-h-full is not needed here. On mobile
        // the shell's main reserves --tab-bar-h (plus --overview-fab-room for the floating Overview button) in
        // its own white; pulling the scope over that strip lets the theme colour reach the bottom of the viewport.
        <div
            className="-mb-[calc(var(--tab-bar-h)+var(--overview-fab-room,0px))] bg-event pb-[calc(var(--tab-bar-h)+var(--overview-fab-room,0px))] md:mb-0 md:pb-0"
            style={themeStyle}
            {...themeFontScopeProps(headingFont)}
        >
            <ThemeFontFace font={headingFont} />
            {children}
        </div>
    );
}
