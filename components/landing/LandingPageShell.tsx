'use client';

import { type ReactNode, useEffect, useRef } from 'react';

import { useLandingInteractions } from '@/hooks/useLandingInteractions';
import { useLandingMotion } from '@/providers/LandingMotionProvider';

export function LandingPageShell({ children }: { children: ReactNode }) {
    const landingRef = useRef<HTMLElement>(null);
    const { paused } = useLandingMotion();
    useLandingInteractions(landingRef, paused);

    useEffect(() => {
        document.body.classList.add('landing-document-scroll');
        return () => document.body.classList.remove('landing-document-scroll');
    }, []);

    return (
        <main className="overflow-x-clip bg-white text-[#151313]" ref={landingRef}>
            {children}
        </main>
    );
}
