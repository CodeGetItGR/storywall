'use client';

import Script from 'next/script';

import { useGoogleAdsTag } from '@/hooks/useGoogleAdsTag';
import { googleAdsInitScript, googleAdsScriptUrl } from '@/lib/googleAds';

// Mounted on the landing page (where ad clicks arrive) and the checkout success
// page (where purchases are recorded). Renders nothing without consent.
export function GoogleAdsTag() {
    const { tagId } = useGoogleAdsTag();
    if (!tagId) return null;

    return (
        <>
            <Script id="google-ads-init" strategy="afterInteractive">
                {googleAdsInitScript(tagId)}
            </Script>
            <Script id="google-ads-gtag" src={googleAdsScriptUrl(tagId)} strategy="afterInteractive" />
        </>
    );
}
