import { NextRequest, NextResponse } from 'next/server';

import { clientIpFrom, clientIpHeaders } from '@/lib/auth/springAuth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const TEMPLATE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const VERSION = /^[1-9]\d{0,8}$/; // the first upload is version 1; the backend rejects leading zeros
const IMAGE_TYPES = new Set(['image/png', 'image/webp']);
const FETCH_TIMEOUT_MS = 10_000;

type Context = { params: Promise<{ templateId: string; version: string }> };

function uncached(status: 404 | 502) {
    return new NextResponse(null, { status, headers: { 'Cache-Control': 'no-store' } });
}

// QR card artwork, served from our own origin like theme fonts: the card SVG, its canvas export and
// CSP (img-src 'self') never touch another origin. The URL carries the artwork version, so a 200 is
// cached for a year, at the CDN too; everything else is no-store. Only PNG and WebP pass, whatever
// the upstream says. The client address goes along and redirect: 'error' keeps its secret home, as
// in the theme font route.
async function serve(request: NextRequest, { params }: Context) {
    const { templateId, version } = await params;
    if (!TEMPLATE_ID.test(templateId) || !VERSION.test(version)) return uncached(404);

    let body: ArrayBuffer | null;
    let type: string;
    try {
        const upstream = await fetch(`${API_BASE_URL}/api/qr-card-templates/${templateId}/artwork/${version}`, {
            method: request.method,
            headers: clientIpHeaders(clientIpFrom(request.headers)),
            cache: 'no-store',
            redirect: 'error',
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (upstream.status !== 200) return uncached(upstream.status === 404 ? 404 : 502);
        type = upstream.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? '';
        if (!IMAGE_TYPES.has(type)) return uncached(502);
        body = request.method === 'HEAD' ? null : await upstream.arrayBuffer();
    } catch {
        return uncached(502);
    }

    return new NextResponse(body, {
        status: 200,
        headers: {
            'Content-Type': type,
            'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
            'X-Content-Type-Options': 'nosniff',
        },
    });
}

export const GET = serve;
export const HEAD = serve;
