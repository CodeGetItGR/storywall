'use client';

import { useCallback } from 'react';

// A stable handler that smoothly scrolls the element with this id to the top of the screen.
export function useScrollToElement(id: string) {
    return useCallback(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [id]);
}
