import type { QueryClient } from '@tanstack/react-query';

import { APP_CONFIG_STALE_TIME, appConfigKeys, fetchAppConfig } from '@/hooks/useAppConfig';
import type { AppConfigResponseDto } from '@/lib/api/types';
import { demoContentVersion, demoStorageKey, keepStoriesLive, swapMediaUrls } from '@/lib/demo/demoDb';
import { registerDemoEventRoute } from '@/lib/demo/demoRouting';
import { createDemoSession, type DemoSession } from '@/lib/demo/demoSession';
import { createDemoHandlers } from '@/lib/demo/mockHandlers';
import { startDemoMocking, startDemoWorker } from '@/lib/demo/mockWorker';
import { fetchDemoSnapshot } from '@/lib/demo/snapshotClient';
import { rebaseSnapshot } from '@/lib/demo/snapshotRebase';

export type DemoBootstrapResult =
    | { kind: 'ready'; session: DemoSession; etag: string | null; presignedUrlsValidUntil: string | null }
    | { kind: 'not-found' }
    | { kind: 'rate-limited' }
    | { kind: 'failed' };

// The app's cache, which the root layout reads config into, and the demo's own.
export type DemoQueryClients = { app: QueryClient; demo: QueryClient };

async function loadAppConfig({ app, demo }: DemoQueryClients): Promise<AppConfigResponseDto | null> {
    try {
        // Joins the app's own config request, or reuses its answer, instead of asking again.
        const config = await app.fetchQuery({ queryKey: appConfigKeys.all, queryFn: fetchAppConfig, staleTime: APP_CONFIG_STALE_TIME });
        // Seeds the demo's cache, so useAppConfig() inside the demo doesn't fetch it again.
        demo.setQueryData(appConfigKeys.all, config, { updatedAt: app.getQueryState(appConfigKeys.all)?.dataUpdatedAt });
        return config;
    } catch {
        return null;
    }
}

// Loads the snapshot in the browser, seeds (or restores) the local store, and switches the
// service worker over to it. Nothing else in the demo renders until this resolves. Once `signal`
// aborts (the visitor left) it never starts mocking.
export async function bootstrapDemo(
    eventTypeKey: string,
    eventTypeSlug: string,
    queryClients: DemoQueryClients,
    signal: AbortSignal,
): Promise<DemoBootstrapResult> {
    // None of the three waits on another, so they load at once.
    const workerStarted = startDemoWorker().then(
        () => true,
        () => false,
    );
    const [result, config] = await Promise.all([fetchDemoSnapshot(eventTypeKey), loadAppConfig(queryClients)]);
    if (result.kind === 'not-found' || result.kind === 'rate-limited') return { kind: result.kind };
    if (result.kind !== 'ok' || !(await workerStarted) || signal.aborted) return { kind: 'failed' };

    const contentVersion = demoContentVersion(result.snapshot);
    const snapshot = rebaseSnapshot(result.snapshot);
    const planTierName = config?.planTiers.find((tier) => tier.code === snapshot.usage.planTier)?.name ?? null;
    const session = createDemoSession(eventTypeKey, snapshot, contentVersion, planTierName);
    // A restored session keeps the visitor's changes but needs this snapshot's media URLs.
    swapMediaUrls(session.db, snapshot);
    keepStoriesLive(session.db);

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
