'use client';

import { useEffect } from 'react';

/**
 * Stops the browser from restoring the old scroll position when the visitor comes back to this page,
 * so it opens at the top instead of jumping while late-loading content grows the page.
 */
export function useManualScrollRestoration() {
    useEffect(() => {
        const previous = window.history.scrollRestoration;
        window.history.scrollRestoration = 'manual';
        return () => {
            window.history.scrollRestoration = previous;
        };
    }, []);
}
