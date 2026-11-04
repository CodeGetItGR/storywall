'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { useCookieConsent } from '@/hooks/useCookieConsent';
import { currentCampaignArrival, isSameCampaign, rememberCampaignArrival, writeCampaignAttributionCookie } from '@/lib/campaignAttribution';
import type { Campaign } from '@/lib/campaignVisits';

// Notes the campaign link in the address, and saves it once analytics consent allows.
export function useCampaignAttributionTracking() {
    const pathname = usePathname();
    const { consent } = useCookieConsent();
    const analytics = consent?.analytics === true;
    // What this tab last wrote, so a route change in an old tab does not overwrite a newer link from another tab.
    const lastWritten = useRef<Campaign | null>(null);

    useEffect(() => {
        rememberCampaignArrival(window.location.href);
    }, [pathname]);

    useEffect(() => {
        if (!analytics) {
            lastWritten.current = null;
            return;
        }
        const arrival = currentCampaignArrival();
        if (!arrival || isSameCampaign(arrival, lastWritten.current)) return;
        writeCampaignAttributionCookie(arrival);
        lastWritten.current = arrival;
    }, [analytics, pathname]);
}
