// Spring's Page<T> envelope — the real shape returned by paginated list
// endpoints (currently just GET /api/events/{eventId}/posts).
export interface Page<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number; // current page, 0-indexed
    size: number;
}

// The backend currently returns a bare T[] from every OTHER list endpoint,
// but pagination is being built out server-side one endpoint at a time.
// Route every such list response through normalizeList() so that swapping
// in a real Page<T>/cursor envelope later is a one-file change instead of
// touching every hook and component.

export interface NormalizedList<T> {
    items: T[];
    nextCursor?: string;
}

// Shape a future paginated envelope might take — kept loose since the
// backend contract isn't finalized yet.
interface PageEnvelope<T> {
    items?: T[];
    content?: T[];
    data?: T[];
    nextCursor?: string | null;
}

function isPageEnvelope<T>(value: unknown): value is PageEnvelope<T> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeList<T>(response: T[] | PageEnvelope<T>): NormalizedList<T> {
    if (Array.isArray(response)) {
        return { items: response };
    }

    if (isPageEnvelope<T>(response)) {
        const items = response.items ?? response.content ?? response.data ?? [];
        return { items, nextCursor: response.nextCursor ?? undefined };
    }

    return { items: [] };
}
