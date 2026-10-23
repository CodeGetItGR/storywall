'use client';

import Script from 'next/script';

import { useGoogleTag } from '@/hooks/useGoogleTag';
import type { GoogleAdsPurchase } from '@/lib/googleAds';
import { googleTagScriptUrl } from '@/lib/googleTag';

type GoogleTagProps = {
    // The paid order to report as a purchase, once known.
    purchase?: GoogleAdsPurchase | null;
};

// Google Ads and Google Analytics. Mounted on the public pages (where ad
// clicks arrive) and the checkout success page (where purchases are
// recorded). Renders nothing without consent.
export function GoogleTag({ purchase = null }: GoogleTagProps) {
    const { scriptTagId, onReady } = useGoogleTag(purchase);
    if (!scriptTagId) return null;

    return <Script id="google-gtag" src={googleTagScriptUrl(scriptTagId)} strategy="afterInteractive" onReady={onReady} />;
}
