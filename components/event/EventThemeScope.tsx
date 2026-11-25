'use client';

import '@/components/event/feedBackdrop.css';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { FeedBackdropLayer } from '@/components/event/FeedBackdropLayer';
import { ThemeFontFace } from '@/components/event/ThemeFontFace';
import { useFeedPageThemeOverride } from '@/hooks/useFeedPageTheme';
import { eventThemeStyle, isThemedEventPage, themeFontScopeProps } from '@/lib/eventTheme';
import { feedBackdropClassName, feedBackdropStyle } from '@/lib/feedPageBackdrop';
import { pageToneProps, pageToneStyle } from '@/lib/pageTone';
import { cn } from '@/lib/utils';
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
    // A Save my date theme on the feed: its background runs behind the whole page, the post cards on its light tone.
    const backdrop = themed ? (override?.backdrop ?? null) : null;
    // Text straight on a page too dark for ink changes colour (`.on-page` in globals.css).
    const tone = themed ? override?.tone : undefined;
    const themeStyle = eventThemeStyle(theme?.backgroundColor, {
        titleColor: theme?.titleColor,
        headingFont: theme?.headingFont,
        cardColor: override?.cardColor,
        toned: tone !== undefined,
    });
    // The font rides with the rest of the theme: a theme whose colour is unusable is no theme at all.
    const headingFont = themeStyle ? theme?.headingFont : null;

    return (
        // Fills the shell's content area: its wrapper is a grid, so min-h-full is not needed here. On mobile
        // the shell's main reserves --tab-bar-h (plus --overview-fab-room for the floating Overview button) in
        // its own white; pulling the scope over that strip lets the theme colour reach the bottom of the viewport.
        <div
            className={cn(
                '-mb-[calc(var(--tab-bar-h)+var(--overview-fab-room,0px))] bg-event pb-[calc(var(--tab-bar-h)+var(--overview-fab-room,0px))] md:mb-0 md:pb-0',
                feedBackdropClassName(backdrop),
            )}
            style={{ ...themeStyle, ...feedBackdropStyle(backdrop), ...pageToneStyle(tone) }}
            data-event-scope=""
            {...pageToneProps(tone)}
            {...themeFontScopeProps(headingFont)}
        >
            <ThemeFontFace font={headingFont} />
            {/* Fixed picture: a cover theme's picture, still behind the scrolling page */}
            {backdrop?.fixed && <FeedBackdropLayer />}
            {/* Page */}
            <div className="feed-backdrop-content">{children}</div>
        </div>
    );
}
