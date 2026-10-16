import type { DemoSnapshotDto } from '@/lib/api/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export function demoSnapshotPath(eventTypeKey: string): string {
    return `/api/demo/${encodeURIComponent(eventTypeKey)}`;
}

function demoSnapshotUrl(eventTypeKey: string): string {
    return `${API_BASE_URL}${demoSnapshotPath(eventTypeKey)}`;
}

function snapshotRequestInit(etag?: string | null): RequestInit {
    return { headers: { Accept: 'application/json', ...(etag ? { 'If-None-Match': etag } : {}) }, cache: 'no-store' };
}

// Where the page's inline script leaves the request it starts, by event type key.
const EARLY_REQUESTS_GLOBAL = '__storywallDemoSnapshot';

type EarlyRequests = Record<string, Promise<Response> | undefined>;

// An inline script for the demo page's HTML. It asks for the snapshot while the page's JS is still
// loading, from the visitor's browser like fetchDemoSnapshot does. Only on a full page load: React
// never runs a script it adds itself.
export function earlyDemoSnapshotScript(eventTypeKey: string): string {
    // `<` escaped, so nothing in a value can close the script tag.
    const json = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');
    const global = json(EARLY_REQUESTS_GLOBAL);
    // The empty catch keeps a failed request out of the console until fetchDemoSnapshot reads it.
    return `try{var r=window[${global}]=window[${global}]||{},p=r[${json(eventTypeKey)}]=fetch(${json(demoSnapshotUrl(eventTypeKey))},${json(snapshotRequestInit())});p.catch(function(){})}catch(e){}`;
}

// The inline script's request, once. Every later load asks again.
function takeEarlyRequest(eventTypeKey: string): Promise<Response> | undefined {
    const requests = (window as unknown as Record<string, EarlyRequests | undefined>)[EARLY_REQUESTS_GLOBAL];
    const request = requests?.[eventTypeKey];
    if (requests) delete requests[eventTypeKey];
    return request;
}

export type DemoSnapshotResult =
    | { kind: 'ok'; snapshot: DemoSnapshotDto; etag: string | null }
    | { kind: 'not-modified' }
    | { kind: 'not-found' }
    | { kind: 'rate-limited' }
    | { kind: 'failed' };

// Must only ever run in the visitor's browser: the endpoint is rate-limited per caller IP, and a
// fetch from the Next.js server would put every visitor in the server's single bucket.
// The one server-side reader is lib/occasions/demoPreview.server.ts, cached so Spring sees about
// one call per type every 5 minutes.
// Deliberately a bare fetch, not lib/api/client — no auth header and no 401 refresh flow.
export async function fetchDemoSnapshot(eventTypeKey: string, etag?: string | null): Promise<DemoSnapshotResult> {
    if (typeof window === 'undefined') {
        throw new Error('fetchDemoSnapshot must run in the browser.');
    }

    let res: Response;
    try {
        const early = etag ? undefined : takeEarlyRequest(eventTypeKey);
        res = await (early ?? fetch(demoSnapshotUrl(eventTypeKey), snapshotRequestInit(etag)));
    } catch {
        return { kind: 'failed' };
    }

    if (res.status === 304) return { kind: 'not-modified' };
    if (res.status === 404) return { kind: 'not-found' };
    if (res.status === 429) return { kind: 'rate-limited' };
    if (!res.ok) return { kind: 'failed' };

    try {
        const snapshot = (await res.json()) as DemoSnapshotDto;
        return { kind: 'ok', snapshot, etag: res.headers.get('etag') };
    } catch {
        return { kind: 'failed' };
    }
}
