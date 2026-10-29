'use client';

import { type ReactNode, useRef } from 'react';

import { useLandingMotionPausedAttribute } from '@/hooks/useLandingMotionPausedAttribute';
import { useLandingStoryInteractions } from '@/hooks/useLandingStoryInteractions';
import type { OccasionThemeId } from '@/lib/occasions/themes';
import { cn } from '@/lib/utils';

type OccasionPageShellProps = {
    children: ReactNode;
    // Extra tokens for a page that does not load landing.css.
    className?: string;
    theme: OccasionThemeId | null;
};

// The tokens occasion sections read, the campaign banner's accent (a dated theme swaps it), and the
// footer's motion toggle, which pauses every CSS animation on the page. Arbitrary variants, not
// before:/after:, so no pseudo-element gets created.
const SHELL_CLASS = [
    'overflow-x-clip bg-white text-[#151313]',
    "[--ink:#151313] [--editorial:Baskerville,'Iowan_Old_Style','Times_New_Roman',Georgia,serif] [--occasion-accent:#e78274]",
    'data-[occasion-theme=winter]:[--occasion-accent:#5b7fa6]',
    '[body[data-landing-motion-paused]_&_*]:[animation-play-state:paused]!',
    '[body[data-landing-motion-paused]_&_*::before]:[animation-play-state:paused]!',
    '[body[data-landing-motion-paused]_&_*::after]:[animation-play-state:paused]!',
].join(' ');

// The landing's page frame without its analytics: landing events carry no page name, so occasion
// visits would count as landing ones.
export function OccasionPageShell({ children, className, theme }: OccasionPageShellProps) {
    const rootRef = useRef<HTMLElement>(null);
    useLandingMotionPausedAttribute();
    // The story galleries: tap or hover a photo to open it.
    useLandingStoryInteractions(rootRef);

    return (
        <main className={cn(SHELL_CLASS, className)} data-occasion-theme={theme ?? undefined} id="top-preview" ref={rootRef}>
            {children}
        </main>
    );
}
