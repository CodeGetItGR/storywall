import type { QueryClient } from '@tanstack/react-query';

import { appConfigKeys } from '@/hooks/useAppConfig';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AppConfigResponseDto } from '@/lib/api/types';
import { demoStorageKey, swapMediaUrls } from '@/lib/demo/demoDb';
import { registerDemoEventRoute } from '@/lib/demo/demoRouting';
import { createDemoSession, type DemoSession } from '@/lib/demo/demoSession';
import { createDemoHandlers } from '@/lib/demo/mockHandlers';
import { startDemoMocking } from '@/lib/demo/mockWorker';
import { fetchDemoSnapshot } from '@/lib/demo/snapshotClient';
import { rebaseSnapshot } from '@/lib/demo/snapshotRebase';

export type DemoBootstrapResult =
    | { kind: 'ready'; session: DemoSession; etag: string | null; presignedUrlsValidUntil: string | null }
    | { kind: 'not-found' }
    | { kind: 'rate-limited' }
    | { kind: 'failed' };

async function loadPlanTierName(queryClient: QueryClient, planTier: string): Promise<string | null> {
    try {
        // Seeds the demo's own cache, so useAppConfig() inside the demo doesn't fetch it again.
        const config = await queryClient.fetchQuery({
            queryKey: appConfigKeys.all,
            queryFn: () => api.publicGet<AppConfigResponseDto>(endpoints.config.get),
        });
        return config.planTiers.find((tier) => tier.code === planTier)?.name ?? null;
    } catch {
        return null;
    }
}

// Loads the snapshot in the browser, seeds (or restores) the local store, and switches the
// service worker over to it. Nothing else in the demo renders until this resolves.
export async function bootstrapDemo(eventTypeKey: string, eventTypeSlug: string, queryClient: QueryClient): Promise<DemoBootstrapResult> {
    const result = await fetchDemoSnapshot(eventTypeKey);
    if (result.kind === 'not-found' || result.kind === 'rate-limited') return { kind: result.kind };
    if (result.kind !== 'ok') return { kind: 'failed' };

    const snapshot = rebaseSnapshot(result.snapshot);
    const planTierName = await loadPlanTierName(queryClient, snapshot.usage.planTier);
    const session = createDemoSession(eventTypeKey, snapshot, planTierName);
    // A restored session keeps the visitor's changes but needs this snapshot's media URLs.
    swapMediaUrls(session.db, snapshot.media);

    registerDemoEventRoute(session.eventId, eventTypeSlug);
    try {
        await startDemoMocking(createDemoHandlers(session));
    } catch {
        return { kind: 'failed' };
    }

    return { kind: 'ready', session, etag: result.etag, presignedUrlsValidUntil: snapshot.presignedUrlsValidUntil };
}

// Drops everything the visitor changed; the next load seeds again from the snapshot.
export function resetDemo(eventTypeKey: string): void {
    try {
        window.localStorage.removeItem(demoStorageKey(eventTypeKey));
    } catch {
        // Storage blocked — nothing was saved, so a reload is already a reset.
    }
    window.location.reload();
}
