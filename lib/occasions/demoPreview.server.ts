import { unstable_cache } from 'next/cache';

import type { Locale } from '@/i18n/config';
import type { DemoSnapshotDto, EventTypeConvention } from '@/lib/api/types';
import { demoSnapshotPath } from '@/lib/demo/snapshotClient';
import { type DemoPreview, pickDemoPreview } from '@/lib/occasions/demoPreview';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const PREVIEW_WINDOW_MS = 5 * 60 * 1000;

// The demo endpoint is rate-limited per caller IP and every server fetch shares this server's
// address, so the snapshot is read at most once per type, language and 5-minute window. The
// window is part of the cache key rather than a revalidate: a stale entry would carry media
// links that expire 15 minutes after the snapshot. Only the small preview is cached; the full
// snapshot can be larger than the data cache's 2 MB item limit.
const loadPreview = unstable_cache(
    async (eventType: EventTypeConvention, locale: Locale, _window: number): Promise<DemoPreview | null> => {
        const res = await fetch(`${API_BASE_URL}${demoSnapshotPath(eventType)}`, {
            headers: { Accept: 'application/json', 'Accept-Language': locale },
            cache: 'no-store',
        });
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`Demo snapshot for ${eventType} failed with status ${res.status}`);
        return pickDemoPreview((await res.json()) as DemoSnapshotDto);
    },
    ['occasion-demo-preview'],
    { revalidate: PREVIEW_WINDOW_MS / 1000 },
);

// Best-effort: null hides the section.
export async function loadOccasionDemoPreview(eventType: EventTypeConvention, locale: Locale): Promise<DemoPreview | null> {
    try {
        return await loadPreview(eventType, locale, Math.floor(Date.now() / PREVIEW_WINDOW_MS));
    } catch {
        return null;
    }
}
