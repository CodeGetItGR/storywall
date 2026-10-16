import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bootstrapDemo } from '@/lib/demo/demoBootstrap';

const mocks = vi.hoisted(() => ({
    fetchDemoSnapshot: vi.fn(),
    fetchAppConfig: vi.fn(),
    startDemoWorker: vi.fn(),
    startDemoMocking: vi.fn(),
    createDemoSession: vi.fn(),
}));

vi.mock('@/hooks/useAppConfig', () => ({
    APP_CONFIG_STALE_TIME: 60_000,
    appConfigKeys: { all: ['app-config'] },
    fetchAppConfig: mocks.fetchAppConfig,
}));
vi.mock('@/lib/demo/snapshotClient', () => ({ fetchDemoSnapshot: mocks.fetchDemoSnapshot }));
vi.mock('@/lib/demo/mockWorker', () => ({ startDemoWorker: mocks.startDemoWorker, startDemoMocking: mocks.startDemoMocking }));
vi.mock('@/lib/demo/demoSession', () => ({ createDemoSession: mocks.createDemoSession }));
vi.mock('@/lib/demo/mockHandlers', () => ({ createDemoHandlers: () => [] }));
vi.mock('@/lib/demo/snapshotRebase', () => ({ rebaseSnapshot: (snapshot: unknown) => snapshot }));
vi.mock('@/lib/demo/demoDb', () => ({
    demoContentVersion: () => 'v1',
    demoStorageKey: () => 'key',
    keepStoriesLive: vi.fn(),
    swapMediaUrls: vi.fn(),
}));

const SNAPSHOT = { usage: { planTier: 'PREMIUM' }, presignedUrlsValidUntil: null };
const CONFIG = { planTiers: [{ code: 'PREMIUM', name: 'Premium' }] };

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((done) => (resolve = done));
    return { promise, resolve };
}

function queryClients() {
    return { app: new QueryClient(), demo: new QueryClient() };
}

beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchDemoSnapshot.mockResolvedValue({ kind: 'ok', snapshot: SNAPSHOT, etag: null });
    mocks.fetchAppConfig.mockResolvedValue(CONFIG);
    mocks.startDemoWorker.mockResolvedValue({});
    mocks.startDemoMocking.mockResolvedValue(undefined);
    mocks.createDemoSession.mockReturnValue({ eventId: 'evt-demo', db: {} });
});

describe('bootstrapDemo', () => {
    it('loads the snapshot, the config and the worker at once', async () => {
        const snapshot = deferred<unknown>();
        mocks.fetchDemoSnapshot.mockReturnValue(snapshot.promise);
        mocks.fetchAppConfig.mockReturnValue(new Promise(() => undefined));
        mocks.startDemoWorker.mockReturnValue(new Promise(() => undefined));

        void bootstrapDemo('WEDDING', 'wedding', queryClients(), new AbortController().signal);
        await Promise.resolve();

        expect(mocks.fetchDemoSnapshot).toHaveBeenCalledOnce();
        expect(mocks.fetchAppConfig).toHaveBeenCalledOnce();
        expect(mocks.startDemoWorker).toHaveBeenCalledOnce();
    });

    it("reuses the app's config and copies it into the demo's cache", async () => {
        const clients = queryClients();
        clients.app.setQueryData(['app-config'], CONFIG);

        const result = await bootstrapDemo('WEDDING', 'wedding', clients, new AbortController().signal);

        expect(result.kind).toBe('ready');
        expect(mocks.fetchAppConfig).not.toHaveBeenCalled();
        expect(clients.demo.getQueryData(['app-config'])).toEqual(CONFIG);
        expect(mocks.createDemoSession).toHaveBeenCalledWith('WEDDING', SNAPSHOT, 'v1', 'Premium');
    });

    it('never starts mocking once the visitor has left', async () => {
        const snapshot = deferred<unknown>();
        mocks.fetchDemoSnapshot.mockReturnValue(snapshot.promise);
        const visit = new AbortController();

        const pending = bootstrapDemo('WEDDING', 'wedding', queryClients(), visit.signal);
        visit.abort();
        snapshot.resolve({ kind: 'ok', snapshot: SNAPSHOT, etag: null });
        await pending;

        expect(mocks.startDemoMocking).not.toHaveBeenCalled();
        expect(mocks.createDemoSession).not.toHaveBeenCalled();
    });

    it('still opens the demo without the config', async () => {
        mocks.fetchAppConfig.mockRejectedValue(new Error('offline'));

        const result = await bootstrapDemo('WEDDING', 'wedding', queryClients(), new AbortController().signal);

        expect(result.kind).toBe('ready');
        expect(mocks.createDemoSession).toHaveBeenCalledWith('WEDDING', SNAPSHOT, 'v1', null);
    });

    it('fails when the worker cannot start', async () => {
        mocks.startDemoWorker.mockRejectedValue(new Error('no service worker'));

        const result = await bootstrapDemo('WEDDING', 'wedding', queryClients(), new AbortController().signal);

        expect(result.kind).toBe('failed');
        expect(mocks.startDemoMocking).not.toHaveBeenCalled();
    });
});
