'use client';

import Script from 'next/script';

import { useGoogleAdsTag } from '@/hooks/useGoogleAdsTag';
import { googleAdsInitScript, type GoogleAdsPurchase, googleAdsScriptUrl } from '@/lib/googleAds';

type GoogleAdsTagProps = {
    // The paid order to report as a purchase, once known.
    purchase?: GoogleAdsPurchase | null;
};

// Mounted on the landing page (where ad clicks arrive) and the checkout success
// page (where purchases are recorded). Renders nothing without consent.
export function GoogleAdsTag({ purchase = null }: GoogleAdsTagProps) {
    const { tagId, onReady } = useGoogleAdsTag(purchase);
    if (!tagId) return null;

    return (
        <>
            <Script id="google-ads-init" strategy="afterInteractive">
                {googleAdsInitScript(tagId)}
            </Script>
            <Script id="google-ads-gtag" src={googleAdsScriptUrl(tagId)} strategy="afterInteractive" onReady={onReady} />
        </>
    );
}
