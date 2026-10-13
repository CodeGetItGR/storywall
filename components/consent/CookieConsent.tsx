'use client';

import { CookieBanner } from '@/components/consent/CookieBanner';
import { CookieSettingsSheet } from '@/components/consent/CookieSettingsSheet';
import { GoogleAdsTag } from '@/components/consent/GoogleAdsTag';

// Everything a page needs to ask for consent and act on it. Only the public
// pages (the landing and the partner page) mount this: they are where ads send visitors.
export function CookieConsent() {
    return (
        <>
            <CookieBanner />
            <CookieSettingsSheet />
            <GoogleAdsTag />
        </>
    );
}
