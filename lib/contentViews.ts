import type { ContentViewsRequestDto, MediaResponseDto, PostResponseDto } from '@/lib/api/types';

export const CONTENT_VIEWS_FLUSH_MS = 10_000;
// The backend's per-list limit.
export const CONTENT_VIEWS_BATCH_MAX = 50;

export type ContentViewKind = 'media' | 'post';
export type SendContentViews = (eventId: string, body: ContentViewsRequestDto, keepalive: boolean) => Promise<unknown>;

// A Pro item someone else uploaded: the only media a view counts on.
export function isCountableProMedia(media: Pick<MediaResponseDto, 'collection' | 'uploaderMemberId'>, memberId: string | null | undefined): boolean {
    return media.collection === 'PRO' && media.uploaderMemberId !== memberId;
}

// A post written by a vendor of the event (the backend sets author.vendorType only for them).
export function isVendorPost(post: Pick<PostResponseDto, 'author'>): boolean {
    return Boolean(post.author?.vendorType);
}

// Views waiting to be sent, per event. An id is queued once per tab: the server keeps one row per member
// anyway, so sending it again would only cost a request. A failed send is dropped, never retried.
export function createContentViewQueue(send: SendContentViews) {
    const seen = new Set<string>();
    const pending = new Map<string, ContentViewsRequestDto>();

    function add(eventId: string, kind: ContentViewKind, id: string): boolean {
        const key = `${eventId}:${kind}:${id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        const batch = pending.get(eventId) ?? { mediaIds: [], postIds: [] };
        (kind === 'media' ? batch.mediaIds : batch.postIds).push(id);
        pending.set(eventId, batch);
        return true;
    }

    function flush(keepalive = false) {
        const batches = [...pending.entries()];
        pending.clear();
        for (const [eventId, batch] of batches) {
            const rounds = Math.ceil(Math.max(batch.mediaIds.length, batch.postIds.length) / CONTENT_VIEWS_BATCH_MAX);
            for (let round = 0; round < rounds; round++) {
                const part = (ids: string[]) => ids.slice(round * CONTENT_VIEWS_BATCH_MAX, (round + 1) * CONTENT_VIEWS_BATCH_MAX);
                send(eventId, { mediaIds: part(batch.mediaIds), postIds: part(batch.postIds) }, keepalive).catch(() => undefined);
            }
        }
    }

    // Forgets everything queued and seen, for a change of account: views belong to whoever was signed in.
    function reset() {
        seen.clear();
        pending.clear();
    }

    return { add, flush, reset };
}
