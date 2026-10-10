'use client';

import { CookieBanner } from '@/components/consent/CookieBanner';
import { CookieSettingsSheet } from '@/components/consent/CookieSettingsSheet';
import { GoogleAdsTag } from '@/components/consent/GoogleAdsTag';

// Everything a page needs to ask for consent and act on it. Only the landing
// page mounts this: it is where ads send visitors.
export function CookieConsent() {
    return (
        <>
            <CookieBanner />
            <CookieSettingsSheet />
            <GoogleAdsTag />
        </>
    );
}
