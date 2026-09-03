'use client';

import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';

export interface StoryFilterSwipeHandlers {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
}

export interface StoryFilterSwipe {
    currentIndex: number;
    visibleName: string | null;
    handlers: StoryFilterSwipeHandlers;
    setIndex: (index: number) => void;
}

const NAME_PILL_DURATION_MS = 1000;
const SWIPE_THRESHOLD_PX = 40;

/** Drives the story composer's filter swipe: the photo itself never moves — swiping past a
 * distance threshold snaps to the next/previous preset (clamped at the ends), and shows a
 * transient name pill for ~1s. */
export function useStoryFilterSwipe(presetIds: string[]): StoryFilterSwipe {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [visibleName, setVisibleName] = useState<string | null>(null);
    const dragStartX = useRef<number | null>(null);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(
        () => () => {
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        },
        []
    );

    function setIndex(index: number) {
        const clamped = Math.max(0, Math.min(presetIds.length - 1, index));
        setCurrentIndex(clamped);
        setVisibleName(presetIds[clamped] ?? null);
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = setTimeout(() => setVisibleName(null), NAME_PILL_DURATION_MS);
    }

    function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
        dragStartX.current = event.clientX;
        event.currentTarget.setPointerCapture(event.pointerId);
    }

    function onPointerUp(event: ReactPointerEvent<HTMLElement>) {
        if (dragStartX.current === null) return;
        const delta = event.clientX - dragStartX.current;
        dragStartX.current = null;
        if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
        setIndex(currentIndex + (delta < 0 ? 1 : -1));
    }

    return { currentIndex, visibleName, handlers: { onPointerDown, onPointerUp }, setIndex };
}
