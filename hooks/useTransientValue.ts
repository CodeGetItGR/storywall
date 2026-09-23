'use client';

import { useEffect, useRef, useState } from 'react';

export interface TransientValue<T> {
    value: T | null;
    show: (value: T) => void;
    clear: () => void;
}

/** Holds a value that clears itself `durationMs` after the last `show`. Showing again restarts the
 * timer, `clear` hides it right away, and a pending timer is cancelled on unmount. */
export function useTransientValue<T>(durationMs: number): TransientValue<T> {
    const [value, setValue] = useState<T | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(
        () => () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        },
        []
    );

    function cancelTimeout() {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
    }

    function show(next: T) {
        cancelTimeout();
        setValue(next);
        timeoutRef.current = setTimeout(() => setValue(null), durationMs);
    }

    function clear() {
        cancelTimeout();
        setValue(null);
    }

    return { value, show, clear };
}
