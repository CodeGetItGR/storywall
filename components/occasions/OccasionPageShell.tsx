'use client';

import { type ReactNode, useRef } from 'react';

import { useLandingDocumentScroll } from '@/hooks/useLandingDocumentScroll';
import { useLandingMotionPausedAttribute } from '@/hooks/useLandingMotionPausedAttribute';
import { useLandingStoryInteractions } from '@/hooks/useLandingStoryInteractions';
import { useOccasionReveal } from '@/hooks/useOccasionReveal';
import type { OccasionThemeId } from '@/lib/occasions/themes';

type OccasionPageShellProps = { children: ReactNode; theme: OccasionThemeId | null };

export function OccasionPageShell({ children, theme }: OccasionPageShellProps) {
    const rootRef = useRef<HTMLElement>(null);
    useLandingDocumentScroll();
    useLandingMotionPausedAttribute();
    // The story galleries: tap or hover a photo to open it.
    useLandingStoryInteractions(rootRef);
    useOccasionReveal(rootRef);

    return (
        <main className="occasion-page overflow-x-clip" data-occasion-theme={theme ?? undefined} id="top-preview" ref={rootRef}>
            {children}
        </main>
    );
}
