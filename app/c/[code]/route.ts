import { type NextRequest, NextResponse } from 'next/server';

import { campaignRedirectUrl } from '@/lib/campaignLinks';
import { fetchCampaignLinkTarget } from '@/lib/campaignLinks.server';

// A campaign's short address. It leads to the link's full URL, where the visit is counted as usual.
// A deleted or unknown code leads home, since a printed QR code can't be recalled.
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const { origin, searchParams } = request.nextUrl;
    const target = await fetchCampaignLinkTarget(code);
    return NextResponse.redirect(target ? campaignRedirectUrl(target, searchParams, origin) : new URL('/', origin));
}
