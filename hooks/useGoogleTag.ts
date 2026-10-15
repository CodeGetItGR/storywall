'use client';

import { useParams, usePathname } from 'next/navigation';
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';

import { useCookieConsent } from '@/hooks/useCookieConsent';
import { GOOGLE_ADS_ID, type GoogleAdsPurchase, trackGoogleAdsPurchase } from '@/lib/googleAds';
import {
    analyticsPageLocation,
    analyticsPageReferrer,
    GA_CONFIG,
    GA_MEASUREMENT_ID,
    setAnalyticsDisabled,
    trackAnalyticsPageview,
} from '@/lib/googleAnalytics';
import { configureGoogleTag, ensureGoogleTag, updateGoogleTagConsent } from '@/lib/googleTag';

export type GoogleTagState = {
    // The id gtag.js loads with, or null when nothing may load.
    scriptTagId: string | null;
    onReady: () => void;
};

// Which Google ids may run: each needs an id configured for this deployment
// and the visitor's consent for its category. A purchase is reported once
// gtag.js has loaded, at most once per order in this page view.
export function useGoogleTag(purchase: GoogleAdsPurchase | null = null): GoogleTagState {
    const { consent } = useCookieConsent();
    const adsTagId = GOOGLE_ADS_ID && consent?.ads === true ? GOOGLE_ADS_ID : null;
    const analyticsTagId = GA_MEASUREMENT_ID && consent?.analytics === true ? GA_MEASUREMENT_ID : null;
    const [ready, setReady] = useState(false);
    const reportedOrderId = useRef<string | null>(null);
    const pathname = usePathname();
    const params = useParams();

    // Set up the tag on the first grant and pass every later change of mind
    // on: once loaded, the script stays until the next full page load.
    useEffect(() => {
        if (!consent) return;
        if (adsTagId || analyticsTagId) ensureGoogleTag();
        updateGoogleTagConsent(consent);
        if (adsTagId) configureGoogleTag(adsTagId);
        if (analyticsTagId) configureGoogleTag(analyticsTagId, GA_CONFIG);
    }, [consent, adsTagId, analyticsTagId]);

    // Analytics runs only while a page that mounts this tag is open, and only
    // with consent. Leaving for any other page switches it off again.
    useEffect(() => {
        if (!analyticsTagId) return;
        setAnalyticsDisabled(analyticsTagId, false);
        return () => setAnalyticsDisabled(analyticsTagId, true);
    }, [analyticsTagId]);

    // One page view per path, under its route rather than its real URL.
    const sendPageview = useEffectEvent((tagId: string) => {
        const { href, origin } = window.location;
        trackAnalyticsPageview(tagId, analyticsPageLocation(href, params ?? {}), analyticsPageReferrer(document.referrer, origin));
    });

    useEffect(() => {
        if (analyticsTagId) sendPageview(analyticsTagId);
    }, [analyticsTagId, pathname]);

    useEffect(() => {
        if (!adsTagId || !ready || !purchase || reportedOrderId.current === purchase.id) return;
        reportedOrderId.current = purchase.id;
        trackGoogleAdsPurchase(adsTagId, purchase);
    }, [purchase, ready, adsTagId]);

    const onReady = useCallback(() => setReady(true), []);

    return { scriptTagId: adsTagId ?? analyticsTagId, onReady };
}
