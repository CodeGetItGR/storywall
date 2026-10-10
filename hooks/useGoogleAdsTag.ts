'use client';

import { useEffect } from 'react';

import { useCookieConsent } from '@/hooks/useCookieConsent';
import { GOOGLE_ADS_ID, updateGoogleAdsConsent } from '@/lib/googleAds';

// Whether the Google Ads tag may load: only with an id configured for this
// deployment and the visitor's Advertising consent.
export function useGoogleAdsTag(): { tagId: string | null } {
    const { consent } = useCookieConsent();
    const granted = consent?.ads === true;

    // A change of mind in the same page view: once loaded, the script stays
    // until the next navigation, so pass the new choice to it.
    useEffect(() => {
        if (typeof consent?.ads === 'boolean') updateGoogleAdsConsent(consent.ads);
    }, [consent?.ads]);

    return { tagId: GOOGLE_ADS_ID && granted ? GOOGLE_ADS_ID : null };
}
