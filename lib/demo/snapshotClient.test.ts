import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { earlyDemoSnapshotScript, fetchDemoSnapshot } from '@/lib/demo/snapshotClient';

const SNAPSHOT = { event: { id: 'evt-1' } };

function snapshotResponse() {
    return new Response(JSON.stringify(SNAPSHOT), { status: 200, headers: { etag: 'W/"1"' } });
}

// Runs the inline script the way the browser does while parsing the page.
function runEarlyScript(eventTypeKey: string) {
    new Function(earlyDemoSnapshotScript(eventTypeKey))();
}

describe('fetchDemoSnapshot', () => {
    const fetchMock = vi.fn<typeof fetch>();

    beforeEach(() => {
        fetchMock.mockReset();
        fetchMock.mockImplementation(() => Promise.resolve(snapshotResponse()));
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        delete (window as unknown as Record<string, unknown>).__storywallDemoSnapshot;
    });

    it('uses the request the page started, once', async () => {
        runEarlyScript('WEDDING');
        expect(fetchMock).toHaveBeenCalledOnce();
        expect(fetchMock.mock.calls[0][0]).toContain('/api/demo/WEDDING');

        expect(await fetchDemoSnapshot('WEDDING')).toEqual({ kind: 'ok', snapshot: SNAPSHOT, etag: 'W/"1"' });
        expect(fetchMock).toHaveBeenCalledOnce();

        await fetchDemoSnapshot('WEDDING');
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('asks again for another event type', async () => {
        runEarlyScript('WEDDING');

        await fetchDemoSnapshot('BAPTISM');

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls[1][0]).toContain('/api/demo/BAPTISM');
    });

    it('sends its own conditional request when it has an etag', async () => {
        runEarlyScript('WEDDING');

        await fetchDemoSnapshot('WEDDING', 'W/"0"');

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({ 'If-None-Match': 'W/"0"' });
    });

    it('fails when the page’s request did', async () => {
        fetchMock.mockImplementationOnce(() => Promise.reject(new TypeError('offline')));
        runEarlyScript('WEDDING');

        expect(await fetchDemoSnapshot('WEDDING')).toEqual({ kind: 'failed' });
    });
});
