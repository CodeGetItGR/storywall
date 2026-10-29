import { NextResponse } from 'next/server';

import { fetchLiveSiteNotices } from '@/lib/siteNotices.server';

// The live site notices for the browser's refetches (hooks/useSiteNotices.ts). The CDN keeps a copy
// for a minute and may serve it for ten more while revalidating, so an outage doesn't blank the bar.
export async function GET() {
    const notices = await fetchLiveSiteNotices();
    return NextResponse.json(notices, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600' },
    });
}
