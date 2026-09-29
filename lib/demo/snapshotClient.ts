import type { DemoSnapshotDto } from '@/lib/api/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export function demoSnapshotPath(eventTypeKey: string): string {
    return `/api/demo/${encodeURIComponent(eventTypeKey)}`;
}

export type DemoSnapshotResult =
    | { kind: 'ok'; snapshot: DemoSnapshotDto; etag: string | null }
    | { kind: 'not-modified' }
    | { kind: 'not-found' }
    | { kind: 'rate-limited' }
    | { kind: 'failed' };

// Must only ever run in the visitor's browser: the endpoint is rate-limited per caller IP, and a
// fetch from the Next.js server would put every visitor in the server's single bucket.
// Deliberately a bare fetch, not lib/api/client — no auth header and no 401 refresh flow.
export async function fetchDemoSnapshot(eventTypeKey: string, etag?: string | null): Promise<DemoSnapshotResult> {
    if (typeof window === 'undefined') {
        throw new Error('fetchDemoSnapshot must run in the browser.');
    }

    let res: Response;
    try {
        res = await fetch(`${API_BASE_URL}${demoSnapshotPath(eventTypeKey)}`, {
            headers: { Accept: 'application/json', ...(etag ? { 'If-None-Match': etag } : {}) },
            cache: 'no-store',
        });
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
