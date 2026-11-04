'use client';

import { useCampaignAttributionTracking } from '@/hooks/useCampaignAttributionTracking';

export function CampaignAttributionTracker() {
    useCampaignAttributionTracking();
    return null;
}
