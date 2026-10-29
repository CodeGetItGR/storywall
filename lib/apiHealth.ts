// Whether this browser can reach Spring. The API client reports every request: a network error or a
// 502/503/504 is a failure, any other answer (4xx and 500 included) means Spring is up. Two failures
// in a row flag it down, which swaps the notice bar to the built-in outage notice
// (spec 2026-10-22-site-notices-design §3). Browser only: on the server this module would be shared
// across requests, so the client never reports there.

const FAILURES_TO_FLAG = 2;
const DOWN_STATUSES = new Set([502, 503, 504]);

let consecutiveFailures = 0;
let down = false;
const listeners = new Set<() => void>();

function setDown(next: boolean) {
    if (next === down) return;
    down = next;
    for (const listener of listeners) listener();
}

function recordFailure() {
    consecutiveFailures += 1;
    if (consecutiveFailures >= FAILURES_TO_FLAG) setDown(true);
}

export function reportApiResponse(status: number): void {
    if (DOWN_STATUSES.has(status)) {
        recordFailure();
        return;
    }
    consecutiveFailures = 0;
    setDown(false);
}

export function reportApiNetworkError(): void {
    recordFailure();
}

export function isApiDown(): boolean {
    return down;
}

export function subscribeApiHealth(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

// Tests only.
export function resetApiHealth(): void {
    consecutiveFailures = 0;
    down = false;
}
