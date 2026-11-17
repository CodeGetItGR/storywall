import { getSafeReturnPath, isCreateEventPath } from '@/lib/auth/returnPath';

// The create form link (with its type, plan and duration) an unverified account was stopped on, kept
// so the email's verification page can send them back to it. In localStorage because that page opens
// in a new tab. Every access is guarded, since storage can be blocked.

const STORAGE_KEY = 'pending_create_event_path';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function rememberPendingCreateEventPath(path: string): void {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ path, savedAt: Date.now() }));
    } catch {
        // Blocked storage: they pick the plan again.
    }
}

export function readPendingCreateEventPath(): string | null {
    try {
        const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as { path?: unknown; savedAt?: unknown } | null;
        if (typeof saved?.path !== 'string' || typeof saved.savedAt !== 'number') return null;
        if (Date.now() - saved.savedAt > MAX_AGE_MS) return null;
        const path = getSafeReturnPath(saved.path);
        return path && isCreateEventPath(path) ? path : null;
    } catch {
        return null;
    }
}

export function clearPendingCreateEventPath(): void {
    try {
        window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Nothing to clear.
    }
}
