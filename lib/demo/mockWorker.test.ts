import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const start = vi.fn();
const stop = vi.fn();
const resetHandlers = vi.fn();
vi.mock('msw/browser', () => ({ setupWorker: () => ({ start, stop, resetHandlers }) }));

const ORIGIN = window.location.origin;

function registration(scope: string, script: string) {
    return { scope: `${ORIGIN}${scope}`, active: { scriptURL: `${ORIGIN}${script}` }, unregister: vi.fn().mockResolvedValue(true) };
}

let registrations: ReturnType<typeof registration>[] = [];

async function load() {
    vi.resetModules();
    return import('@/lib/demo/mockWorker');
}

function deferred() {
    let resolve!: () => void;
    const promise = new Promise<void>((done) => (resolve = done));
    return { promise, resolve };
}

beforeEach(() => {
    start.mockReset().mockResolvedValue(undefined);
    stop.mockReset();
    resetHandlers.mockReset();
    registrations = [];
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: { getRegistrations: async () => registrations, controller: null } });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('demo mock worker', () => {
    // Registered at the root it controlled every page of the site after a demo visit, and its
    // passthrough broke the real feed stream's CORS preflight.
    it('controls only the demo pages', async () => {
        const { startDemoMocking } = await load();
        await startDemoMocking([]);
        expect(start).toHaveBeenCalledWith(
            expect.objectContaining({ serviceWorker: { url: '/mockServiceWorker.js', options: { scope: '/demo/' } } }),
        );
    });

    it('stops a worker that finishes starting after the visitor left the demo', async () => {
        const starting = deferred();
        start.mockReturnValue(starting.promise);
        const { startDemoMocking, stopDemoMocking } = await load();

        const pending = startDemoMocking([]);
        stopDemoMocking();
        expect(stop).not.toHaveBeenCalled();

        starting.resolve();
        await pending;
        await Promise.resolve();
        expect(stop).toHaveBeenCalledTimes(1);
    });

    it('keeps the worker when the visitor comes straight back', async () => {
        const { startDemoMocking, stopDemoMocking } = await load();
        await startDemoMocking([]);

        stopDemoMocking();
        await startDemoMocking([]);
        await Promise.resolve();

        expect(stop).not.toHaveBeenCalled();
        expect(resetHandlers).toHaveBeenCalledTimes(2);
    });

    it('stops a running worker when the visitor leaves', async () => {
        const { startDemoMocking, stopDemoMocking } = await load();
        await startDemoMocking([]);

        stopDemoMocking();
        await Promise.resolve();
        await Promise.resolve();

        expect(stop).toHaveBeenCalledTimes(1);
    });

    it('unregisters a site-wide demo worker and leaves every other registration alone', async () => {
        const siteWide = registration('/', '/mockServiceWorker.js');
        const scoped = registration('/demo/', '/mockServiceWorker.js');
        const other = registration('/', '/sw.js');
        registrations = [siteWide, scoped, other];
        const { unregisterSiteWideDemoWorker } = await load();

        await unregisterSiteWideDemoWorker();

        expect(siteWide.unregister).toHaveBeenCalledTimes(1);
        expect(scoped.unregister).not.toHaveBeenCalled();
        expect(other.unregister).not.toHaveBeenCalled();
    });

    // MSW reuses an existing registration of its script, scope and all.
    it('removes the site-wide worker before starting', async () => {
        const siteWide = registration('/', '/mockServiceWorker.js');
        registrations = [siteWide];
        const { startDemoMocking } = await load();

        await startDemoMocking([]);

        expect(siteWide.unregister.mock.invocationCallOrder[0]).toBeLessThan(start.mock.invocationCallOrder[0]);
    });
});
