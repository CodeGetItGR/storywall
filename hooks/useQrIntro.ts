'use client';

import { useCallback, useEffect, useState } from 'react';

// How long the intro stays before it fades on its own, and how long the fade takes.
export const QR_INTRO_MS = 4000;
export const QR_INTRO_FADE_MS = 300;

type Phase = 'shown' | 'leaving' | 'gone';

// The intro over a scanned code's choices: it shows each time the page opens, fades after a few
// seconds, and goes at once on a tap or Escape. Nothing is stored, so the next scan shows it again.
// Kept above the choices, so going back from a form doesn't bring it back.
export function useQrIntro(enabled: boolean) {
    const [phase, setPhase] = useState<Phase>('shown');
    const [progressStarted, setProgressStarted] = useState(false);

    const dismiss = useCallback(() => {
        setPhase((current) => (current === 'shown' ? 'leaving' : current));
    }, []);

    useEffect(() => {
        if (!enabled) return;
        const frame = requestAnimationFrame(() => setProgressStarted(true));
        const timer = window.setTimeout(dismiss, QR_INTRO_MS);
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') dismiss();
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            cancelAnimationFrame(frame);
            window.clearTimeout(timer);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [enabled, dismiss]);

    useEffect(() => {
        if (phase !== 'leaving') return;
        const timer = window.setTimeout(() => setPhase('gone'), QR_INTRO_FADE_MS);
        return () => window.clearTimeout(timer);
    }, [phase]);

    return { isOpen: enabled && phase !== 'gone', isLeaving: phase === 'leaving', progressStarted, dismiss };
}
