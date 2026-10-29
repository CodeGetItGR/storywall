// A discount code handed out in a partner's link (`?promo=CODE`), kept on the device until the
// visitor reaches the activation checkout. Landing → app and email verification are full page
// loads, possibly in another tab, so page memory is not enough. The visitor followed the link to get
// the discount and sees the code in the checkout field, so it needs no analytics consent.
export const PARTNER_CODE_PARAM = 'promo';
const STORAGE_KEY = 'storywall.partnerCode';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
// Spring's CollaborationCodeRequestDto rules, so a link can't carry anything else.
const CODE_PATTERN = /^[A-Za-z0-9-]{1,40}$/;

function cleanCode(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const code = value.trim();
    return CODE_PATTERN.test(code) ? code : null;
}

export function partnerCodeFromUrl(href: string): string | null {
    return cleanCode(new URL(href).searchParams.get(PARTNER_CODE_PARAM));
}

// The address without the promo param, for replacing the one in the address bar; null if it had none.
export function withoutPartnerCodeParam(href: string): string | null {
    const url = new URL(href);
    if (!url.searchParams.has(PARTNER_CODE_PARAM)) return null;
    url.searchParams.delete(PARTNER_CODE_PARAM);
    return `${url.pathname}${url.search}${url.hash}`;
}

const listeners = new Set<() => void>();

// For useSyncExternalStore: this tab's saves and clears.
export function subscribePartnerCode(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function notify() {
    listeners.forEach((listener) => listener());
}

// Storage that throws (private mode, blocked site data) just means no prefill.
export function savePartnerCode(code: string, now = Date.now()): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ code, savedAt: now }));
    } catch {
        // No prefill.
    }
    notify();
}

export function clearPartnerCode(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Nothing to clear.
    }
    notify();
}

export function readPartnerCode(now = Date.now()): string | null {
    let saved: unknown;
    try {
        saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    } catch {
        return null;
    }
    if (!saved || typeof saved !== 'object') return null;
    const { code, savedAt } = saved as Record<string, unknown>;
    if (typeof savedAt !== 'number' || now - savedAt > MAX_AGE_MS) {
        // No notify: this runs as a useSyncExternalStore snapshot, which must not trigger renders.
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // Nothing to clear.
        }
        return null;
    }
    return cleanCode(code);
}
