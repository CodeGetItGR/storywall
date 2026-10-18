'use client';

import type { ReactNode } from 'react';

import { useLandingDocumentScroll } from '@/hooks/useLandingDocumentScroll';
import { useLandingMotionPausedAttribute } from '@/hooks/useLandingMotionPausedAttribute';
import type { OccasionThemeId } from '@/lib/occasions/themes';

type OccasionPageShellProps = { children: ReactNode; theme: OccasionThemeId | null };

// The landing's page frame without its analytics: landing events carry no page name, so occasion
// visits would count as landing ones.
export function OccasionPageShell({ children, theme }: OccasionPageShellProps) {
    useLandingDocumentScroll();
    useLandingMotionPausedAttribute();

    return (
        <main className="occasion-page overflow-x-clip bg-white text-[#151313]" data-occasion-theme={theme ?? undefined} id="top-preview">
            {children}
        </main>
    );
}
