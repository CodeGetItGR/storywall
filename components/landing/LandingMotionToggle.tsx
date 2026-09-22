'use client';

import { Pause, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useLandingMotion } from '@/providers/LandingMotionProvider';

// The accessible name carries the state, matching how the menu toggle here
// already reports open versus closed.
export function LandingMotionToggle({ className = '' }: { className?: string }) {
    const t = useTranslations('LandingPage.shell');
    const { paused, toggle } = useLandingMotion();

    return (
        <button
            aria-label={paused ? t('playMotion') : t('pauseMotion')}
            className={`grid size-11 shrink-0 place-items-center rounded-full border border-[#151313]/20 text-[#151313] transition-opacity hover:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ef8f72] ${className}`}
            onClick={toggle}
            type="button"
        >
            {paused ? <Play aria-hidden="true" className="size-4 translate-x-px" /> : <Pause aria-hidden="true" className="size-4" />}
        </button>
    );
}
