'use client';

import { type RefObject, useLayoutEffect } from 'react';

/** Scrolls a container back to the top whenever `value` changes, e.g. a new step of a multi-step form. */
export function useScrollTopOnChange(containerRef: RefObject<HTMLElement | null>, value: unknown) {
    useLayoutEffect(() => {
        containerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    }, [containerRef, value]);
}
