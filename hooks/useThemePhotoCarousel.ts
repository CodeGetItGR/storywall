'use client';

import { type TouchEvent, useCallback, useRef, useState } from 'react';

// A sideways swipe at least this long changes the photo; shorter or mostly upright ones scroll the page.
const SWIPE_MIN_PX = 40;

// Which of a theme's photos shows, with arrows, dots and a sideways swipe on phones.
export function useThemePhotoCarousel(count: number) {
    const [index, setIndex] = useState(0);
    const start = useRef<{ x: number; y: number } | null>(null);
    const current = count > 0 ? Math.min(index, count - 1) : 0;

    const previous = useCallback(() => setIndex((value) => (value + count - 1) % count), [count]);
    const next = useCallback(() => setIndex((value) => (value + 1) % count), [count]);

    const onTouchStart = useCallback((event: TouchEvent) => {
        const touch = event.touches[0];
        if (touch) start.current = { x: touch.clientX, y: touch.clientY };
    }, []);

    const onTouchEnd = useCallback(
        (event: TouchEvent) => {
            const from = start.current;
            const touch = event.changedTouches[0];
            start.current = null;
            if (!from || !touch || count <= 1) return;
            const dx = touch.clientX - from.x;
            const dy = touch.clientY - from.y;
            if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy)) return;
            if (dx < 0) next();
            else previous();
        },
        [count, next, previous],
    );

    return { index: current, select: setIndex, previous, next, onTouchStart, onTouchEnd };
}
