'use client';

import { useEffect, useRef } from 'react';

/**
 * navigateToCheckout does a full-page redirect to Stripe. If the host hits the
 * browser's Back button from there, the browser can restore this page from
 * its back/forward cache instead of reloading it — freezing whatever
 * "opening checkout" pending state was on screen at redirect time, with the
 * pay button stuck disabled and no way to recover short of a manual refresh.
 * `pageshow`'s `persisted` flag fires only on that restore, so resetting
 * there clears the frozen state.
 */
export function useResetOnBfcacheRestore(reset: () => void): void {
    const resetRef = useRef(reset);

    useEffect(() => {
        resetRef.current = reset;
    }, [reset]);

    useEffect(() => {
        function handlePageShow(event: PageTransitionEvent) {
            if (event.persisted) resetRef.current();
        }
        window.addEventListener('pageshow', handlePageShow);
        return () => window.removeEventListener('pageshow', handlePageShow);
    }, []);
}
