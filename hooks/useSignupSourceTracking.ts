'use client';

import { useParams, usePathname } from 'next/navigation';
import { useEffect, useEffectEvent } from 'react';

import { useCookieConsent } from '@/hooks/useCookieConsent';
import { replacePageUrl } from '@/lib/overlayHistory';
import {
    captureVisitSource,
    carryClickTarget,
    currentVisitSource,
    isLandingPath,
    pickVisitSource,
    rememberVisitSource,
    withoutVisitSourceParam,
    writeVisitSourceCookie,
} from '@/lib/signupSource';

// Where the visitor came from, for the account they may create. Every page counts and the first
// visit wins. It lives in page memory, and also in a cookie with analytics consent. A landing page
// passes it to the app in the link, since that hop is a full page load.
export function useSignupSourceTracking() {
    const pathname = usePathname();
    const params = useParams();
    const { consent } = useCookieConsent();
    const analytics = consent?.analytics === true;

    const capture = useEffectEvent(() => {
        const { href } = window.location;
        rememberVisitSource(pickVisitSource(currentVisitSource(), captureVisitSource(href, document.referrer, params ?? {})));
        const cleaned = withoutVisitSourceParam(href);
        if (cleaned) replacePageUrl(cleaned);
    });

    useEffect(() => {
        capture();
    }, [pathname]);

    useEffect(() => {
        const source = currentVisitSource();
        if (analytics && source) writeVisitSourceCookie(source);
    }, [analytics, pathname]);

    useEffect(() => {
        if (!isLandingPath(pathname)) return;
        const abortController = new AbortController();
        // Capture phase, so this runs before Next's Link, which skips a click already prevented.
        document.addEventListener(
            'click',
            (event) => {
                const href = carryClickTarget(event, window.location.origin, currentVisitSource());
                if (!href) return;
                event.preventDefault();
                window.location.assign(href);
            },
            { capture: true, signal: abortController.signal },
        );
        return () => abortController.abort();
    }, [pathname]);
}
