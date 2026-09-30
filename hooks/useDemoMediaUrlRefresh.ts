'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { swapMediaUrls } from '@/lib/demo/demoDb';
import type { DemoSession } from '@/lib/demo/demoSession';
import { fetchDemoSnapshot } from '@/lib/demo/snapshotClient';

// Refresh this long before the presigned URLs stop working.
const REFRESH_MARGIN_MS = 5 * 60 * 1000;
const MIN_DELAY_MS = 30 * 1000;
const RETRY_DELAY_MS = 60 * 1000;
const MAX_RETRIES = 5;

type UrlState = { etag: string | null; validUntil: string | null; attempt: number };

function delayUntil(validUntil: string): number {
    return Math.max(Date.parse(validUntil) - Date.now() - REFRESH_MARGIN_MS, MIN_DELAY_MS);
}

// Re-fetches the snapshot (If-None-Match) before its presigned URLs expire and swaps the new
// media and persona picture URLs in. The visitor's own changes are untouched.
export function useDemoMediaUrlRefresh(session: DemoSession, initialEtag: string | null, initialValidUntil: string | null) {
    const queryClient = useQueryClient();
    const [urls, setUrls] = useState<UrlState>({ etag: initialEtag, validUntil: initialValidUntil, attempt: 0 });

    useEffect(() => {
        if (!urls.validUntil || urls.attempt > MAX_RETRIES) return;
        let cancelled = false;

        const timer = setTimeout(
            async () => {
                const result = await fetchDemoSnapshot(session.eventTypeKey, urls.etag);
                if (cancelled) return;

                if (result.kind === 'ok') {
                    swapMediaUrls(session.db, result.snapshot);
                    void queryClient.invalidateQueries();
                    setUrls({ etag: result.etag, validUntil: result.snapshot.presignedUrlsValidUntil, attempt: 0 });
                } else if (result.kind === 'not-modified') {
                    // Nothing changed, so there are no new URLs to swap in.
                    setUrls((current) => ({ ...current, validUntil: null }));
                } else {
                    setUrls((current) => ({ ...current, attempt: current.attempt + 1 }));
                }
            },
            urls.attempt > 0 ? RETRY_DELAY_MS : delayUntil(urls.validUntil),
        );

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [queryClient, session, urls]);
}
