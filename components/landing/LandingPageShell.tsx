'use client';

import { type ReactNode, useRef } from 'react';

import { useLandingClickTracking } from '@/hooks/useLandingClickTracking';
import { useLandingDocumentScroll } from '@/hooks/useLandingDocumentScroll';
import { useLandingInteractions } from '@/hooks/useLandingInteractions';
import { useLandingSectionTracking } from '@/hooks/useLandingSectionTracking';
import { useManualScrollRestoration } from '@/hooks/useManualScrollRestoration';
import { useLandingMotion } from '@/providers/LandingMotionProvider';

export function LandingPageShell({ children }: { children: ReactNode }) {
    const landingRef = useRef<HTMLElement>(null);
    const { paused } = useLandingMotion();
    useLandingInteractions(landingRef, paused);
    useLandingClickTracking(landingRef);
    useLandingSectionTracking(landingRef);
    useManualScrollRestoration();
    useLandingDocumentScroll();

    return (
        <main className="overflow-x-clip bg-white text-[#151313]" ref={landingRef}>
            {children}
        </main>
    );
}
