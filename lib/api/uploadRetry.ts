import { getBusyRetryAfterSeconds } from '@/lib/api/errors';

// The upload routes refuse before reading the body when the server is full
// (503 3017 with Retry-After: too many uploads in flight, low temp disk, the
// video lanes busy). Such an upload is resent on its own after the advised
// wait, a few times, before the caller's manual Retry takes over.
export const UPLOAD_BUSY_MAX_RETRIES = 3;
const MAX_BUSY_WAIT_MS = 60 * 1000;
// Up to this share of the wait is added at random, so uploads turned away
// together don't all come back in the same second.
const BUSY_JITTER_RATIO = 0.2;
// Refusing early, the server may reset the connection while the browser is
// still sending, which surfaces as a network error rather than the 503.
const NETWORK_RETRY_DELAYS_MS = [2000, 5000];

export interface UploadRetryOptions {
    signal?: AbortSignal;
    // true while waiting to resend, false once the resend starts.
    onBusy?: (busy: boolean) => void;
}

function isNetworkError(error: unknown): boolean {
    // fetch rejects with a TypeError when the connection fails; an abort is a DOMException.
    return error instanceof TypeError;
}

export function uploadBusyDelayMs(error: unknown, random: () => number = Math.random): number | null {
    const seconds = getBusyRetryAfterSeconds(error);
    if (seconds === undefined) return null;
    const base = seconds * 1000;
    return Math.min(MAX_BUSY_WAIT_MS, Math.round(base + base * BUSY_JITTER_RATIO * random()));
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(signal.reason);
            return;
        }
        const onAbort = () => {
            clearTimeout(timer);
            reject(signal?.reason);
        };
        const timer = setTimeout(() => {
            signal?.removeEventListener('abort', onAbort);
            resolve();
        }, ms);
        signal?.addEventListener('abort', onAbort, { once: true });
    });
}

// Sends an upload, resending it when the server says it's busy (or drops the
// connection, which can be the same refusal). Any other error, or running out
// of retries, is thrown as it came.
export async function sendUploadWithBusyRetry<T>(send: () => Promise<T>, { signal, onBusy }: UploadRetryOptions = {}): Promise<T> {
    let networkRetries = 0;
    for (let retries = 0; ; retries += 1) {
        try {
            return await send();
        } catch (error) {
            if (signal?.aborted || retries >= UPLOAD_BUSY_MAX_RETRIES) throw error;
            let delay = uploadBusyDelayMs(error);
            if (delay === null && isNetworkError(error) && networkRetries < NETWORK_RETRY_DELAYS_MS.length) {
                delay = NETWORK_RETRY_DELAYS_MS[networkRetries];
                networkRetries += 1;
            }
            if (delay === null) throw error;

            onBusy?.(true);
            try {
                await wait(delay, signal);
            } finally {
                onBusy?.(false);
            }
        }
    }
}
