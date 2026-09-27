import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthSessionDto } from '@/lib/api/types';
import { clearSession, setSession } from '@/lib/auth/tokenStore';
import {
    CRASH_DEDUPE_MS,
    CRASH_MAX_PER_HOUR,
    CRASH_MAX_PER_PAGE,
    installCrashReporter,
    reportCrash,
    resetCrashReporterForTests,
} from '@/lib/betaFeedback/crashReporter';
import { setCurrentRouteTemplate } from '@/lib/betaFeedback/routeTemplates';
import { CRASH_REPORT_TIMES_KEY } from '@/lib/storageKeys';

function crash(n: number) {
    const error = new Error(`boom ${n}`);
    error.stack = `Error: boom ${n}\n    at frame${n} (app.js:1:1)`;
    return error;
}

describe('reportCrash', () => {
    let fetchMock: ReturnType<typeof vi.fn>;
    let uninstall: () => void;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-09-28T10:00:00Z'));
        localStorage.clear();
        resetCrashReporterForTests();
        setSession({ accessToken: 'access', userId: 'u1' } as AuthSessionDto);
        fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
        vi.stubGlobal('fetch', fetchMock);
        uninstall = installCrashReporter();
    });

    afterEach(() => {
        uninstall();
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('posts JSON with keepalive and a token-free page template', () => {
        setCurrentRouteTemplate('/q/:token');
        reportCrash(crash(1));

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toMatch(/\/api\/error-events\/client$/);
        expect(init).toMatchObject({ method: 'POST', keepalive: true });
        expect(init.headers).toMatchObject({ 'Content-Type': 'application/json', Authorization: 'Bearer access' });
        const body = JSON.parse(init.body);
        expect(body).toMatchObject({ name: 'Error', message: 'boom 1', pageUrl: `${window.location.origin}/q/:token` });
        expect(Object.keys(body).sort()).toEqual(['appVersion', 'message', 'name', 'pageUrl', 'stack']);
    });

    it('drops an identical crash within 60s and sends it again after', () => {
        reportCrash(crash(1));
        reportCrash(crash(1));
        expect(fetchMock).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(CRASH_DEDUPE_MS);
        reportCrash(crash(1));
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('sends at most 5 per page load', () => {
        for (let i = 0; i < CRASH_MAX_PER_PAGE + 3; i++) reportCrash(crash(i));
        expect(fetchMock).toHaveBeenCalledTimes(CRASH_MAX_PER_PAGE);
    });

    it('keeps at most 15 per rolling hour across reloads', () => {
        const now = Date.now();
        localStorage.setItem(
            CRASH_REPORT_TIMES_KEY,
            JSON.stringify([...Array.from({ length: CRASH_MAX_PER_HOUR - 1 }, () => now - 1000), now - 3_600_001]),
        );

        reportCrash(crash(1));
        reportCrash(crash(2));
        expect(fetchMock).toHaveBeenCalledTimes(1);

        // The oldest entry ages out of the hour.
        vi.advanceTimersByTime(3_600_000);
        reportCrash(crash(3));
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it.each([429, 409])('stops for the rest of the page load after a %i', async (status) => {
        fetchMock.mockResolvedValueOnce(new Response(null, { status }));
        reportCrash(crash(1));
        await vi.runAllTimersAsync();

        reportCrash(crash(2));
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('never throws or retries when the send fails', async () => {
        fetchMock.mockRejectedValueOnce(new TypeError('network'));
        expect(() => reportCrash(crash(1))).not.toThrow();
        await vi.runAllTimersAsync();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('skips the send without a session', () => {
        clearSession();
        reportCrash(crash(1));
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('does nothing once uninstalled (feature off)', () => {
        uninstall();
        reportCrash(crash(1));
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('names a non-Error rejection UnhandledRejection', () => {
        reportCrash('plain string');
        expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ name: 'UnhandledRejection', message: 'plain string' });
    });
});
