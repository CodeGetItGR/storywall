'use client';

import { type KeyboardEvent, useCallback, useLayoutEffect, useRef } from 'react';

// The open locked text: it takes focus so Escape closes it, and hands its element to the toolbar to anchor to.
export function useLockedActiveText(onElement: (element: HTMLElement | null) => void, onDone: () => void) {
    const host = useRef<HTMLElement | null>(null);
    const setHost = useCallback(
        (element: HTMLElement | null) => {
            host.current = element;
            onElement(element);
        },
        [onElement],
    );

    useLayoutEffect(() => {
        host.current?.focus({ preventScroll: true });
    }, []);

    const onKeyDown = useCallback(
        (event: KeyboardEvent<HTMLElement>) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            onDone();
        },
        [onDone],
    );

    return { setHost, onKeyDown };
}
