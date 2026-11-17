'use client';

import { useCallback, useEffect, useState } from 'react';

import { EDITOR_TOUR_DELAY_MS, EDITOR_TOUR_STEPS, hasSeenEditorTour, markEditorTourSeen } from '@/lib/invitation/editorTour';

function browserStorage(): Storage | null {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

// The editor tour's steps. It opens by itself the first time this browser opens the editor.
export function useEditorTour({ autoStart = true }: { autoStart?: boolean } = {}) {
    const [index, setIndex] = useState<number | null>(null);
    const last = EDITOR_TOUR_STEPS.length - 1;

    useEffect(() => {
        if (!autoStart || hasSeenEditorTour(browserStorage())) return;
        // Marked once it shows, so a refresh after that doesn't bring it back.
        const timer = setTimeout(() => {
            markEditorTourSeen(browserStorage());
            setIndex(0);
        }, EDITOR_TOUR_DELAY_MS);
        return () => clearTimeout(timer);
    }, [autoStart]);

    const start = useCallback(() => {
        markEditorTourSeen(browserStorage());
        setIndex(0);
    }, []);
    const next = useCallback(() => setIndex((current) => (current === null || current >= last ? null : current + 1)), [last]);
    const back = useCallback(() => setIndex((current) => (current === null ? null : Math.max(0, current - 1))), []);
    const close = useCallback(() => setIndex(null), []);

    return {
        isOpen: index !== null,
        step: index === null ? null : EDITOR_TOUR_STEPS[index],
        index: index ?? 0,
        total: EDITOR_TOUR_STEPS.length,
        isFirst: index === 0,
        isLast: index === last,
        start,
        next,
        back,
        close,
    };
}

export type EditorTourState = ReturnType<typeof useEditorTour>;
