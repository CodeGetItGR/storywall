'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useRef } from 'react';

import { useLandingInteractions } from '@/hooks/useLandingInteractions';
import { useLandingMotion } from '@/providers/LandingMotionProvider';

export const LANDING_MAIN_ID = 'main-content';

export function LandingPageShell({ children }: { children: ReactNode }) {
    const landingRef = useRef<HTMLElement>(null);
    const t = useTranslations('LandingPage.shell');
    const { paused } = useLandingMotion();
    useLandingInteractions(landingRef, paused);

    useEffect(() => {
        document.body.classList.add('landing-document-scroll');
        return () => document.body.classList.remove('landing-document-scroll');
    }, []);

    return (
        <>
            {/* Skip link — first focusable element, visible only while focused */}
            <a
                className="sr-only focus:not-sr-only focus:fixed focus:inset-x-3 focus:top-3 focus:z-100 focus:mx-auto focus:w-fit focus:rounded-full focus:bg-[#151313] focus:px-5 focus:py-2.5 focus:text-[13px] focus:font-bold focus:text-white focus:no-underline focus:shadow-[0_12px_28px_rgba(21,19,19,.25)] focus-ring focus-visible:outline-offset-2"
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
