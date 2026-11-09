'use client';

import { CookieBanner } from '@/components/consent/CookieBanner';
import { CookieSettingsSheet } from '@/components/consent/CookieSettingsSheet';
import { GoogleTag } from '@/components/consent/GoogleTag';
import { MetaPixel } from '@/components/consent/MetaPixel';

// Everything a page needs to ask for consent and act on it. Only the public
// pages (the landing and the partner page) mount this: they are where ads send visitors.
// Meta gets no email to match on these pages.
export function CookieConsent() {
    return (
        <>
            <CookieBanner />
            <CookieSettingsSheet />
            <GoogleTag />
            <MetaPixel email={null} />
        </>
    );
}
