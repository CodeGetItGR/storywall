'use client';

import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';

export interface StoryFilterSwipeHandlers {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
}

export interface StoryFilterSwipe {
    currentIndex: number;
    targetIndex: number | null;
    dragProgress: number;
    visibleName: string | null;
    handlers: StoryFilterSwipeHandlers;
    setIndex: (index: number) => void;
}

const NAME_PILL_DURATION_MS = 1000;
const DRAG_FULL_PX = 120;
const COMMIT_PROGRESS = 0.5;

function candidateForOffset(offsetPx: number, currentIndex: number, length: number): number | null {
    if (offsetPx === 0) return null;
    const next = currentIndex + (offsetPx < 0 ? 1 : -1);
    return next >= 0 && next < length ? next : null;
}

/** Drives the story composer's live filter swipe: the photo stays fixed while dragging
 * crossfades a preview of the next/previous preset on top of it in real time, committing on
 * release once dragged at least halfway, or snapping back if released early. Clamped at both
 * ends — no wraparound. */
export function useStoryFilterSwipe(presetIds: string[]): StoryFilterSwipe {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [dragOffsetPx, setDragOffsetPx] = useState(0);
    const [committedName, setCommittedName] = useState<string | null>(null);
    const dragStartX = useRef<number | null>(null);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(
        () => () => {
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        },
        []
    );

    const targetIndex = candidateForOffset(dragOffsetPx, currentIndex, presetIds.length);
    const dragProgress = targetIndex === null ? 0 : Math.min(Math.abs(dragOffsetPx) / DRAG_FULL_PX, 1);
    const visibleName = dragProgress > 0 && targetIndex !== null ? presetIds[targetIndex] : committedName;

    function setIndex(index: number) {
        const clamped = Math.max(0, Math.min(presetIds.length - 1, index));
        setCurrentIndex(clamped);
        setCommittedName(presetIds[clamped] ?? null);
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = setTimeout(() => setCommittedName(null), NAME_PILL_DURATION_MS);
    }

    function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
        dragStartX.current = event.clientX;
        event.currentTarget.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
        if (dragStartX.current === null) return;
        setDragOffsetPx(event.clientX - dragStartX.current);
    }

    function onPointerUp() {
        if (dragStartX.current === null) return;
        dragStartX.current = null;
        if (targetIndex !== null && dragProgress >= COMMIT_PROGRESS) {
            setIndex(targetIndex);
        } else {
            setCommittedName(null);
        }
        setDragOffsetPx(0);
    }

    return {
        currentIndex,
        targetIndex,
        dragProgress,
        visibleName,
        handlers: { onPointerDown, onPointerMove, onPointerUp },
        setIndex,
    };
}
