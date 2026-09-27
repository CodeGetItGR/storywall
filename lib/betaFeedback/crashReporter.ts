import type { ClientErrorRequestDto } from '@/lib/api/types';
import { getAccessToken } from '@/lib/auth/tokenStore';
import { APP_VERSION } from '@/lib/betaFeedback/bugReport';
import { currentPageUrl } from '@/lib/betaFeedback/routeTemplates';
import { CRASH_REPORT_TIMES_KEY } from '@/lib/storageKeys';

// Crash capture (beta-feedback-fe-integration.md §6). Fire and forget: no UI,
// no retries, and a failure to report is never itself reported. The server
// allows 20 per user an hour; the client budget below stays under it.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const CLIENT_ERRORS_PATH = '/api/error-events/client';

export const CRASH_DEDUPE_MS = 60_000;
export const CRASH_MAX_PER_PAGE = 5;
export const CRASH_MAX_PER_HOUR = 15;
const HOUR_MS = 3_600_000;

const lastSentByKey = new Map<string, number>();
let sentThisPage = 0;
let stopped = false;
let enabled = false;

function clip(value: string | null | undefined, max: number): string | null {
    return value ? value.slice(0, max) : null;
}

// Rolling hour across reloads, kept in localStorage. Storage that throws
// (private mode, blocked site data) falls back to the per-page cap alone.
function takeHourBudget(now: number): boolean {
    let times: number[] = [];
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(CRASH_REPORT_TIMES_KEY) ?? '[]');
        if (Array.isArray(parsed)) times = parsed.filter((t): t is number => typeof t === 'number');
    } catch {
        // storage blocked or corrupt
    }
    times = times.filter((t) => now - t < HOUR_MS);
    if (times.length >= CRASH_MAX_PER_HOUR) return false;
    times.push(now);
    try {
        localStorage.setItem(CRASH_REPORT_TIMES_KEY, JSON.stringify(times));
    } catch {
        // ignore
    }
    return true;
}

export function buildClientErrorRequest(error: unknown, componentStack?: string): ClientErrorRequestDto {
    const err = error instanceof Error ? error : null;
    const name = (err?.name || (err ? 'Error' : 'UnhandledRejection')).trim() || 'Error';
    const message = err ? err.message : String(error);
    const stack = [err?.stack, componentStack].filter(Boolean).join('\n');
    return {
        name: name.slice(0, 256),
        message: clip(message, 1024),
        stack: clip(stack, 8192),
        pageUrl: clip(currentPageUrl(), 2048),
        appVersion: clip(APP_VERSION, 64),
    };
}

function dedupeKey(request: ClientErrorRequestDto): string {
    return `${request.name}|${request.message ?? ''}|${request.stack?.split('\n')[1] ?? ''}`;
}

export function reportCrash(error: unknown, componentStack?: string): void {
    if (!enabled || stopped) return;
    // A crash with no session (login page, signed-out) can't be reported.
    const token = getAccessToken();
    if (!token) return;

    const request = buildClientErrorRequest(error, componentStack);
    const key = dedupeKey(request);
    const now = Date.now();
    if (now - (lastSentByKey.get(key) ?? -Infinity) < CRASH_DEDUPE_MS) return;
    if (sentThisPage >= CRASH_MAX_PER_PAGE || !takeHourBudget(now)) return;
    lastSentByKey.set(key, now);
    sentThisPage += 1;

    try {
        // Bare fetch, not the api client: no 401 retry, and never recorded as a recent error.
        fetch(`${API_BASE_URL}${CLIENT_ERRORS_PATH}`, {
            method: 'POST',
            keepalive: true,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(request),
        })
            .then((res) => {
                // 429: out of budget. 409: switched off (5100). Either way, done for this page load.
                if (res.status === 429 || res.status === 409) stopped = true;
            })
            .catch(() => {
                // never report a failure to report
            });
    } catch {
        // never report a failure to report
    }
}

function handleWindowError(event: ErrorEvent): void {
    reportCrash(event.error ?? event.message);
}

function handleUnhandledRejection(event: PromiseRejectionEvent): void {
    reportCrash(event.reason);
}

// Installed once the config says beta feedback is on; the returned function
// removes the listeners again if it's switched off.
export function installCrashReporter(): () => void {
    enabled = true;
    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
        enabled = false;
        window.removeEventListener('error', handleWindowError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
}

export function resetCrashReporterForTests(): void {
    lastSentByKey.clear();
    sentThisPage = 0;
    stopped = false;
    enabled = false;
}
