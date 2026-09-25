// Server-only: a direct authenticated GET against Spring, used to prefetch
// React Query cache entries in Server Components before handing them to
// <HydrationBoundary>. Deliberately minimal — no 401 retry/refresh, since a
// stale token here just means the prefetch is skipped and the existing
// client-side hook fetches normally after hydration (see the try/catch
// around every call site).

import { getServerLocale } from '@/i18n/serverLocale';
import { endpoints } from '@/lib/api/endpoints';
import type { EventDetailResponseDto, ModuleKeyConvention } from '@/lib/api/types';
import { readableModuleKeys } from '@/lib/eventLifecycle';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export const PUBLIC_CONFIG_CACHE_TAG = 'public-config';
export const PUBLIC_CONFIG_REVALIDATE_SECONDS = 300;

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

// Whether the event has the module, mirroring useModuleReadable, so a prefetch
// skips a read the backend would answer with 409 / 5012. The event detail
// fetch is deduped with the (event) layout's own within one render.
export async function serverModuleReadable(eventId: string, moduleKey: ModuleKeyConvention, accessToken: string): Promise<boolean> {
    const event = await serverGet<EventDetailResponseDto>(endpoints.events.byId(eventId), accessToken);
    return readableModuleKeys(event).has(moduleKey);
}

// Server-only: like serverGet, but for endpoints that don't require auth (e.g.
// GET /api/config). No Authorization header is sent.
export async function serverPublicGet<T>(path: string): Promise<T> {
    const locale = await getServerLocale();
    const res = await fetch(`${API_BASE_URL}${path}`, {
        headers: { 'Accept-Language': locale },
        cache: 'no-store',
    });

    if (!res.ok) {
        throw new Error(`Server prefetch failed for ${path} with status ${res.status}`);
    }

    return res.json() as Promise<T>;
}

// The public configuration controls landing-page feature gates and pricing.
// It is safe to share between visitors, but is deliberately separate from the
// generic public helper so future public endpoints do not become cached by
// accident.
export async function serverPublicConfigGet<T>(path: string): Promise<T> {
    const locale = await getServerLocale();
    const res = await fetch(`${API_BASE_URL}${path}`, {
        headers: { 'Accept-Language': locale },
        next: {
            revalidate: PUBLIC_CONFIG_REVALIDATE_SECONDS,
            tags: [PUBLIC_CONFIG_CACHE_TAG],
        },
    });

    if (!res.ok) {
        throw new Error(`Server prefetch failed for ${path} with status ${res.status}`);
    }

    return res.json() as Promise<T>;
}
