// Closed site notices, as "id:version" keys joined by "." in one cookie. A cookie rather than
// localStorage so the server leaves a closed notice out of the HTML (no flash on load). Capped at
// the newest twenty keys; every access is guarded, since cookies can be blocked.

export const DISMISSED_COOKIE = 'site_notice_dismissed';

const SEPARATOR = '.';
const MAX_KEYS = 20;
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const KEY = /^[0-9a-zA-Z-]{1,64}:\d{1,9}$/;

const listeners = new Set<() => void>();

export function parseDismissals(raw: string | null | undefined): string[] {
    if (!raw) return [];
    return raw.split(SEPARATOR).filter((key) => KEY.test(key));
}

export function addDismissal(raw: string, key: string): string {
    const keys = parseDismissals(raw).filter((existing) => existing !== key);
    keys.push(key);
    return keys.slice(-MAX_KEYS).join(SEPARATOR);
}

export function readDismissalsCookie(): string {
    try {
        const match = document.cookie.split('; ').find((part) => part.startsWith(`${DISMISSED_COOKIE}=`));
        return match ? decodeURIComponent(match.slice(DISMISSED_COOKIE.length + 1)) : '';
    } catch {
        return '';
    }
}

export function writeDismissalsCookie(raw: string): void {
    try {
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `${DISMISSED_COOKIE}=${encodeURIComponent(raw)}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
    } catch {
        // Blocked cookies: the notice closes for this page view only.
    }
    for (const listener of listeners) listener();
}

export function subscribeDismissals(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
