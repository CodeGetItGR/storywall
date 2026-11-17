'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';

import type { QrLandingView } from '@/hooks/useQrLanding';
import type { QrLandingChoice } from '@/lib/qrLanding';
import { closestScrollContainer } from '@/lib/scrollContainer';

// The choices and the forms share one page, so a form would open wherever the choices were scrolled to.
// A form opens at the top; back returns to the spot in the choices the guest tapped from.
export function useQrViewScroll(view: QrLandingView | null, onChoose: (choice: QrLandingChoice) => void) {
    const ref = useRef<HTMLDivElement>(null);
    const saved = useRef<{ container: HTMLElement; top: number } | null>(null);
    const previous = useRef(view);

    // Read before the form replaces the choices: once it does, a shorter page has already clamped the position.
    const choose = useCallback(
        (choice: QrLandingChoice) => {
            const container = closestScrollContainer(ref.current);
            saved.current = { container, top: container.scrollTop };
            onChoose(choice);
        },
        [onChoose],
    );

    useLayoutEffect(() => {
        const from = previous.current;
        previous.current = view;
        if (from === view || !saved.current) return;

        const { container, top } = saved.current;
        if (view === 'chooser') {
            container.scrollTop = top;
            saved.current = null;
        } else {
            container.scrollTop = 0;
        }
    }, [view]);

    return { ref, choose };
}
