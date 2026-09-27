// Media URLs from the backend are presigned R2 URLs. The backend signs them per
// window of a third of `media.presignedUrlTtlMinutes` (GET /api/config), so every
// response in one window carries the same URL for the same file, and each URL is
// handed out with at least two-thirds of its TTL left.

const MINUTE_MS = 60_000;
// The window for the smallest TTL the backend has shipped with (15 min), used until
// /api/config has loaded. Refreshing more often than needed is harmless.
const FALLBACK_REFRESH_MS = 5 * MINUTE_MS;

// How often a list that carries presigned URLs has to be refetched so none it holds
// expires: once per signing window. Held for one more window after that, a URL still
// has a third of its TTL to spare.
export function presignedUrlRefreshMs(ttlMinutes: number | undefined): number {
    return ttlMinutes && ttlMinutes > 0 ? (ttlMinutes * MINUTE_MS) / 3 : FALLBACK_REFRESH_MS;
}

// Whether two presigned URLs point at the same file, whatever their signatures.
export function samePresignedObject(a: string, b: string): boolean {
    return a.split('?')[0] === b.split('?')[0];
}
