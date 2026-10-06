import { NextRequest, NextResponse } from 'next/server';

import { clientIpFrom, clientIpHeaders } from '@/lib/auth/springAuth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const FONT_KEY = /^[a-z0-9][a-z0-9-]{1,62}$/;
const FILE = /^(0|[1-9]\d{0,8})\.woff2$/; // the backend rejects leading zeros too
const FETCH_TIMEOUT_MS = 10_000;

type Context = { params: Promise<{ fontKey: string; file: string }> };

function uncached(status: 404 | 502) {
    return new NextResponse(null, { status, headers: { 'Cache-Control': 'no-store' } });
}

// Theme font files, served from our own origin so CSP can stay font-src 'self' and no R2 CORS is
// needed. The backend URL carries the file version, so the bytes behind a URL never change: a 200
// is cached for a year, at the CDN too (Vercel only caches function responses with s-maxage).
// Everything else is no-store, so an outage or a not-yet-uploaded file isn't pinned in caches.
// The browser's address goes along (as springAuth.ts does), or every viewer would share one
// rate-limit bucket on the backend; redirect: 'error' keeps that secret from following a redirect.
// HEAD goes upstream as HEAD, so no body is read.
async function serve(request: NextRequest, { params }: Context) {
    const { fontKey, file } = await params;
    if (!FONT_KEY.test(fontKey) || !FILE.test(file)) return uncached(404);

    let body: ArrayBuffer | null;
    try {
        const upstream = await fetch(`${API_BASE_URL}/api/theme-fonts/${fontKey}/${file}`, {
            method: request.method,
            headers: clientIpHeaders(clientIpFrom(request.headers)),
            cache: 'no-store',
            redirect: 'error',
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (upstream.status !== 200) return uncached(upstream.status === 404 ? 404 : 502);
        body = request.method === 'HEAD' ? null : await upstream.arrayBuffer();
    } catch {
        return uncached(502);
    }

    return new NextResponse(body, {
        status: 200,
        headers: {
            'Content-Type': 'font/woff2',
            'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
            'X-Content-Type-Options': 'nosniff',
        },
    });
}

export const GET = serve;
export const HEAD = serve;
