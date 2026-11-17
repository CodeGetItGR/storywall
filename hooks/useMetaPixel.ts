'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { useCookieConsent } from '@/hooks/useCookieConsent';
import {
    ensureMetaPixel,
    initMetaPixel,
    META_PIXEL_ID,
    type MetaPixelPurchase,
    trackMetaPixelPageview,
    trackMetaPixelPurchase,
    updateMetaPixelConsent,
} from '@/lib/metaPixel';

export type MetaPixelOptions = {
    // The signed-in visitor's email, for Meta to match. undefined while it is
    // still loading, so the pixel waits rather than starting without it.
    email: string | null | undefined;
    // The paid order to report as a purchase, once known.
    purchase?: MetaPixelPurchase | null;
};

// Whether the pixel may run: it needs an id configured for this deployment and
// the visitor's consent to advertising. Returns the id to load, or null.
export function useMetaPixel({ email, purchase = null }: MetaPixelOptions): string | null {
    const { consent } = useCookieConsent();
    const pixelId = META_PIXEL_ID && consent?.ads === true ? META_PIXEL_ID : null;
    const emailKnown = email !== undefined;
    const ready = Boolean(pixelId) && emailKnown;
    const reportedOrderId = useRef<string | null>(null);
    const pathname = usePathname();

    // Set up the pixel on the first grant and pass every later change of mind
    // on: once loaded, the script stays until the next full page load.
    useEffect(() => {
        if (!consent) return;
        if (pixelId && emailKnown) {
            ensureMetaPixel();
            updateMetaPixelConsent(true);
            initMetaPixel(pixelId, email ?? null);
        } else if (!pixelId) {
            updateMetaPixelConsent(false);
        }
    }, [consent, pixelId, email, emailKnown]);

    // One page view per path.
    useEffect(() => {
        if (ready) trackMetaPixelPageview();
    }, [ready, pathname]);

    useEffect(() => {
        if (!ready || !purchase || reportedOrderId.current === purchase.id) return;
        reportedOrderId.current = purchase.id;
        trackMetaPixelPurchase(purchase);
    }, [purchase, ready]);

    return ready ? pixelId : null;
}
