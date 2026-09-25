import { NextRequest, NextResponse } from 'next/server';

import { isGoogleMapsShortLink, readGoogleMapsRedirect } from '@/lib/maps';

const RESOLVE_TIMEOUT_MS = 5000;

// Follows one Google Maps short link (maps.app.goo.gl) to the long URL it
// points at, so the schedule can build a map preview from it. Only short-link
// hosts are fetched and only the first redirect is read, so this can't be used
// to reach arbitrary URLs.
export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');
    if (!url || !isGoogleMapsShortLink(url)) return NextResponse.json(null, { status: 400 });

    try {
        const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(RESOLVE_TIMEOUT_MS) });
        const resolvedUrl = readGoogleMapsRedirect(response.headers.get('location'), url);
        if (!resolvedUrl) return NextResponse.json(null, { status: 404 });

        return NextResponse.json({ resolvedUrl }, { headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' } });
    } catch {
        return NextResponse.json(null, { status: 502 });
    }
}
