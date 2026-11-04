'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { useCookieConsent } from '@/hooks/useCookieConsent';
import { currentCampaignArrival, rememberCampaignArrival, writeCampaignAttributionCookie } from '@/lib/campaignAttribution';

// Notes the campaign link in the address, and saves it once analytics consent allows.
export function useCampaignAttributionTracking() {
    const pathname = usePathname();
    const { consent } = useCookieConsent();
    const analytics = consent?.analytics === true;

    useEffect(() => {
        rememberCampaignArrival(window.location.href);
    }, [pathname]);

    useEffect(() => {
        const arrival = currentCampaignArrival();
        if (analytics && arrival) writeCampaignAttributionCookie(arrival);
    }, [analytics, pathname]);
}
