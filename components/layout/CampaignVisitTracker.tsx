'use client';

import { useCampaignVisitTracking } from '@/hooks/useCampaignVisitTracking';

export function CampaignVisitTracker() {
    useCampaignVisitTracking();
    return null;
}
