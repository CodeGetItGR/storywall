import { NextResponse } from 'next/server';

import { fetchLiveDiscountCampaign } from '@/lib/discountCampaign.server';

// The live discount campaign for the browser's refetches (hooks/useLiveDiscountCampaign.ts). Same
// caching as app/api/site-notices.
export async function GET() {
    const campaign = await fetchLiveDiscountCampaign();
    return NextResponse.json(campaign, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600' },
    });
}
