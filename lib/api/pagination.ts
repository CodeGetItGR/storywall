// The backend currently returns a bare T[] from every list endpoint, but
// pagination is being built server-side. Route every list response through
// normalizeList() so that swapping in a real Page<T>/cursor envelope later
// is a one-file change instead of touching every hook and component.

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
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
