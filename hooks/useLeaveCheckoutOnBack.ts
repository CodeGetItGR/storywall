'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

const GUARD_KEY = '__storywallCheckoutReturnGuard';

function isGuardEntry(state: unknown): boolean {
    return Boolean(state && typeof state === 'object' && (state as Record<string, unknown>)[GUARD_KEY]);
}

/**
 * The page before a checkout return is the payment provider's, which the browser
 * may restore still asking for payment. Adds one in-app entry on top, so Back
 * lands here first and goes to `href` instead.
 */
export function useLeaveCheckoutOnBack(href: string) {
    const router = useRouter();
    // Back goes wherever the page points at the time, e.g. the feed once paid.
    const hrefRef = useRef(href);

    useEffect(() => {
        hrefRef.current = href;
    }, [href]);

    useEffect(() => {
        // Already on the extra entry (a remount): don't stack a second one.
        if (!isGuardEntry(window.history.state)) {
            const state = window.history.state as Record<string, unknown> | null;
            window.history.pushState({ ...(state ?? {}), [GUARD_KEY]: true }, '', window.location.href);
        }

        const handlePopState = (event: PopStateEvent) => {
            if (isGuardEntry(event.state)) return;
            router.replace(hrefRef.current);
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [router]);
}
