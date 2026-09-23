'use client';

import { Pause, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useLandingMotion } from '@/providers/LandingMotionProvider';

// The visible label carries the state, so the button needs no separate
// accessible name. Colour and size come from whichever surface hosts it.
export function LandingMotionToggle({ className = '' }: { className?: string }) {
    const t = useTranslations('LandingPage.shell');
    const { paused, toggle } = useLandingMotion();
    const Icon = paused ? Play : Pause;

    return (
        <button
            className={`inline-flex items-center gap-2 py-1.5 text-left focus-ring transition-opacity hover:opacity-60 focus-visible:outline-offset-4 ${className}`}
            onClick={toggle}
            type="button"
        >
            <Icon aria-hidden="true" className="size-3.5 shrink-0" />
            {paused ? t('playMotion') : t('pauseMotion')}
        </button>
    );
}
