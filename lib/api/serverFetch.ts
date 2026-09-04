// Server-only: a direct authenticated GET against Spring, used to prefetch
// React Query cache entries in Server Components before handing them to
// <HydrationBoundary>. Deliberately minimal — no 401 retry/refresh, since a
// stale token here just means the prefetch is skipped and the existing
// client-side hook fetches normally after hydration (see the try/catch
// around every call site).

import { getServerLocale } from '@/i18n/serverLocale';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export async function serverGet<T>(path: string, accessToken: string): Promise<T> {
    const locale = await getServerLocale();
    const res = await fetch(`${API_BASE_URL}${path}`, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Accept-Language': locale },
        cache: 'no-store',
    });

    if (!res.ok) {
        throw new Error(`Server prefetch failed for ${path} with status ${res.status}`);
    }

    return res.json() as Promise<T>;
}
