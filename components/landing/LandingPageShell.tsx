'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useRef } from 'react';

import { useLandingInteractions } from '@/hooks/useLandingInteractions';

export const LANDING_MAIN_ID = 'main-content';

export function LandingPageShell({ children }: { children: ReactNode }) {
    const landingRef = useRef<HTMLElement>(null);
    const t = useTranslations('LandingPage.shell');
    useLandingInteractions(landingRef);

    useEffect(() => {
        document.body.classList.add('landing-document-scroll');
        return () => document.body.classList.remove('landing-document-scroll');
    }, []);

    return (
        <>
            {/* Skip link — first focusable element, visible only while focused */}
            <a
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100 focus:rounded-md focus:bg-[#151313] focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-white focus:no-underline focus:outline-2 focus:outline-offset-2 focus:outline-white"
                href={`#${LANDING_MAIN_ID}`}
            >
                {t('skipToContent')}
            </a>
            <main className="overflow-x-clip bg-white text-[#151313]" id={LANDING_MAIN_ID} ref={landingRef} tabIndex={-1}>
                {children}
            </main>
        </>
    );
}
