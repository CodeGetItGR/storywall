'use client';

import { type ReactNode, useEffect, useRef } from 'react';

import { useLandingInteractions } from '@/hooks/useLandingInteractions';

export function LandingPageShell({ children }: { children: ReactNode }) {
    const landingRef = useRef<HTMLElement>(null);
    useLandingInteractions(landingRef);

    useEffect(() => {
        document.body.classList.add('landing-document-scroll');
        return () => document.body.classList.remove('landing-document-scroll');
    }, []);

    return (
        <main ref={landingRef} className="overflow-x-clip bg-white text-[#151313]">
            {children}
        </main>
    );
}
