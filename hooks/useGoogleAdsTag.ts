'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useCookieConsent } from '@/hooks/useCookieConsent';
import { GOOGLE_ADS_ID, type GoogleAdsPurchase, trackGoogleAdsPurchase, updateGoogleAdsConsent } from '@/lib/googleAds';

// Whether the Google Ads tag may load: only with an id configured for this
// deployment and the visitor's Advertising consent. A purchase is reported
// once gtag.js has loaded, at most once per order in this page view.
export function useGoogleAdsTag(purchase: GoogleAdsPurchase | null = null): { tagId: string | null; onReady: () => void } {
    const { consent } = useCookieConsent();
    const granted = consent?.ads === true;
    const tagId = GOOGLE_ADS_ID && granted ? GOOGLE_ADS_ID : null;
    const [ready, setReady] = useState(false);
    const reportedOrderId = useRef<string | null>(null);

    // A change of mind in the same page view: once loaded, the script stays
    // until the next navigation, so pass the new choice to it.
    useEffect(() => {
        if (typeof consent?.ads === 'boolean') updateGoogleAdsConsent(consent.ads);
    }, [consent?.ads]);

    useEffect(() => {
        if (!tagId || !ready || !purchase || reportedOrderId.current === purchase.id) return;
        reportedOrderId.current = purchase.id;
        trackGoogleAdsPurchase(tagId, purchase);
    }, [purchase, ready, tagId]);

    const onReady = useCallback(() => setReady(true), []);

    return { tagId, onReady };
}
