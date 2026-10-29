'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useEffectEvent } from 'react';

import { campaignFromUrl, pageLanguage, rememberCampaign, sendCampaignVisit } from '@/lib/campaignVisits';
import { isLandingPath } from '@/lib/signupSource';

// Counts an arrival from a campaign link on a landing page. A page without utm values keeps the
// campaign it already has, so later clicks still count for it. Spring ignores repeats in 30 minutes.
export function useCampaignVisitTracking() {
    const pathname = usePathname();

    const capture = useEffectEvent(() => {
        if (!isLandingPath(pathname)) return;
        const campaign = campaignFromUrl(window.location.href);
        if (!campaign) return;
        rememberCampaign(campaign);
        sendCampaignVisit('VISIT', campaign, pageLanguage(pathname));
    });

    useEffect(() => {
        capture();
    }, [pathname]);
}
