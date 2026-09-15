// Spring's PagedModel<T> envelope returned by every paginated list endpoint.
export interface Page<T> {
    content: T[];
    page: {
        size: number;
        number: number; // current page, 0-indexed
        totalElements: number;
        totalPages: number;
    };
}

// Some non-paginated list endpoints still return bare arrays. Route those
// responses through normalizeList() so a later envelope change remains local.

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
